import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import {
  PlantationScopedRequest,
  canAccessFarmPlot,
  restrictedFarmPlotSql
} from '../middleware/plantation.middleware';

type ScopedRequest = PlantationScopedRequest;

const EVALUATION_STATUSES = new Set([
  'NOT_EVALUATED', 'IN_PROGRESS', 'COMPLIANT', 'PARTIAL', 'NON_COMPLIANT',
  'NOT_APPLICABLE', 'PENDING_VERIFICATION', 'CLOSED'
]);
const MANAGEMENT_STATUSES = new Set(['DRAFT', 'IN_REVIEW', 'APPROVED', 'CLOSED']);

const parseJson = <T>(value: unknown, fallback: T): T => {
  if (value == null) return fallback;
  if (typeof value === 'object') return value as T;
  try { return JSON.parse(String(value)) as T; } catch { return fallback; }
};

const asNumber = (value: unknown) => Number(value || 0);

type EvaluationRow = {
  clause: string;
  principleCode: string | null;
  isCritical: number | boolean;
  status: string | null;
  applicability: string | null;
  processes: unknown;
  processCodes: unknown;
};

export function calculateCompliance(rows: EvaluationRow[]) {
  const normalized = rows.map(row => ({
    ...row,
    status: row.status || 'NOT_EVALUATED',
    applicability: row.applicability || 'APPLICABLE',
    isCritical: Boolean(row.isCritical)
  }));
  const applicable = normalized.filter(row =>
    !(row.status === 'NOT_APPLICABLE' && row.applicability === 'NOT_APPLICABLE')
  );
  const value: Record<string, number> = {
    COMPLIANT: 1, CLOSED: 1, PARTIAL: 0.5, IN_PROGRESS: 0.25,
    PENDING_VERIFICATION: 0.5, NON_COMPLIANT: 0, NOT_EVALUATED: 0
  };
  const base = applicable.length
    ? Math.round(applicable.reduce((total, row) => total + (value[row.status] ?? 0), 0) / applicable.length * 100)
    : 0;
  const critical = applicable.filter(row => row.isCritical);
  const criticalNonCompliant = critical.filter(row => row.status === 'NON_COMPLIANT').length;
  const criticalPending = critical.filter(row =>
    ['NOT_EVALUATED', 'IN_PROGRESS', 'PARTIAL', 'PENDING_VERIFICATION'].includes(row.status)
  ).length;
  const overall = criticalNonCompliant > 0 ? Math.min(base, 49) : criticalPending > 0 ? Math.min(base, 79) : base;
  const statusCounts = normalized.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});
  return {
    overall,
    baseScore: base,
    total: normalized.length,
    applicable: applicable.length,
    notApplicable: normalized.length - applicable.length,
    criticalTotal: critical.length,
    criticalCompliant: critical.filter(row => ['COMPLIANT', 'CLOSED'].includes(row.status)).length,
    criticalPending,
    criticalNonCompliant,
    statusCounts
  };
}

function groupCompliance(rows: EvaluationRow[], key: (row: EvaluationRow) => string) {
  const groups = new Map<string, EvaluationRow[]>();
  rows.forEach(row => {
    const groupKey = key(row) || 'Sin asignar';
    groups.set(groupKey, [...(groups.get(groupKey) || []), row]);
  });
  return [...groups.entries()].map(([name, items]) => ({ name, ...calculateCompliance(items) }));
}

type PcScope = {
  scopeType: 'MILL' | 'PLANTATION' | 'SMALLHOLDER';
  scopeId: string;
  farmPlotId: string | null;
  profileLabel: string;
  farmPlot?: Record<string, any>;
};

export function plantationPcScopeType(area: unknown): 'PLANTATION' | 'SMALLHOLDER' {
  return asNumber(area) <= 50 ? 'SMALLHOLDER' : 'PLANTATION';
}

async function resolvePcScope(req: ScopedRequest, farmPlotId?: unknown): Promise<PcScope> {
  const uocId = req.uocId!;
  let plotId = String(farmPlotId || '').trim();
  if (!plotId && req.plantationScope?.restricted) {
    if (req.plantationScope.farmPlotIds.length !== 1) {
      throw Object.assign(
        new Error('Seleccione una de las plantaciones asignadas a su usuario.'),
        { statusCode: 400 }
      );
    }
    plotId = req.plantationScope.farmPlotIds[0];
  }
  if (!plotId) {
    return {
      scopeType: 'MILL',
      scopeId: 'MILL',
      farmPlotId: null,
      profileLabel: 'Planta extractora'
    };
  }
  if (!canAccessFarmPlot(req, plotId)) {
    throw Object.assign(new Error('No tiene acceso a la plantación solicitada.'), { statusCode: 403 });
  }
  const [rows] = await db.query(
    `SELECT fp.*,ss.name sourceName,ss.relationshipType
     FROM FarmPlot fp
     JOIN SupplySource ss ON ss.id=fp.supplySourceId
     WHERE fp.id=? AND fp.uocId=?`,
    [plotId, uocId]
  );
  const farmPlot = (rows as any[])[0];
  if (!farmPlot) throw Object.assign(new Error('Plantación no encontrada en la UoC.'), { statusCode: 404 });
  const scopeType = plantationPcScopeType(farmPlot.area);
  return {
    scopeType,
    scopeId: farmPlot.id,
    farmPlotId: farmPlot.id,
    profileLabel: scopeType === 'SMALLHOLDER' ? 'Pequeño productor (≤ 50 ha)' : 'Plantación',
    farmPlot
  };
}

function indicatorSelect(scope: PcScope, uocId: string) {
  const evidenceScope = scope.farmPlotId ? 'e.farmPlotId=?' : 'e.farmPlotId IS NULL';
  const evidenceLinkScope = scope.farmPlotId ? 'erl.farmPlotId=?' : 'erl.farmPlotId IS NULL';
  const findingScope = scope.farmPlotId ? 'n.farmPlotId=?' : 'n.farmPlotId IS NULL';
  const sql = `
  SELECT r.id,r.clause,r.title,r.description,r.principleCode,r.criterionCode,
    r.indicatorText,r.officialText,r.officialSourceUrl,r.sourceLanguage,r.officialImportedAt,
    r.standardVersion,r.isCritical,r.expectedEvidence,
    r.processCodes,r.sortOrder,
    pe.id evaluationId,COALESCE(pe.status,'NOT_EVALUATED') status,
    COALESCE(pe.applicability,'APPLICABLE') applicability,pe.complianceLevel,
    pe.responsible,pe.processes,pe.result,pe.observation,pe.evaluatedAt,pe.evaluatorId,
    pe.dueDate,pe.noApplyJustification,pe.noApplyEvidenceId,pe.noApplyApprovedBy,
    pe.noApplyApprovedAt,pe.updatedAt,
    (SELECT COUNT(DISTINCT e.id) FROM Evidence e
      WHERE e.uocId=? AND (
        (e.requirementId=r.id AND ${evidenceScope})
        OR EXISTS (
          SELECT 1 FROM EvidenceRequirementLink erl
          WHERE erl.evidenceId=e.id AND erl.uocId=e.uocId
            AND erl.requirementId=r.id AND ${evidenceLinkScope}
        )
      )) evidenceCount,
    (SELECT COUNT(*) FROM NonConformance n WHERE n.uocId=? AND n.requirementId=r.id AND ${findingScope} AND COALESCE(n.workflowStatus,n.status)<>'CLOSED') findingCount
  FROM Requirement r
  LEFT JOIN PcEvaluation pe ON pe.requirementId=r.id AND pe.uocId=? AND pe.scopeType=? AND pe.scopeId=?
  WHERE r.standardId='RSPO' AND COALESCE(r.active,TRUE)=TRUE
`;
  const params: any[] = [
    uocId,
    ...(scope.farmPlotId ? [scope.farmPlotId] : []),
    ...(scope.farmPlotId ? [scope.farmPlotId] : []),
    uocId, ...(scope.farmPlotId ? [scope.farmPlotId] : []),
    uocId, scope.scopeType, scope.scopeId
  ];
  return { sql, params };
}

function normalizeIndicator(row: any) {
  return {
    ...row,
    isCritical: Boolean(row.isCritical),
    expectedEvidence: parseJson(row.expectedEvidence, []),
    processCodes: parseJson(row.processCodes, []),
    processes: parseJson(row.processes, []),
    complianceLevel: row.complianceLevel == null ? null : asNumber(row.complianceLevel),
    evidenceCount: asNumber(row.evidenceCount),
    findingCount: asNumber(row.findingCount)
  };
}

export async function getPcSummary(req: ScopedRequest, res: Response) {
  try {
    const uocId = req.uocId!;
    const [uocRows] = await db.query('SELECT * FROM CertificationUnit WHERE id=?', [uocId]);
    const uoc = (uocRows as any[])[0];
    if (!uoc) { res.status(404).json({ error: 'Unidad de certificación no encontrada.' }); return; }
    const summaryScope = await resolvePcScope(req, req.query.farmPlotId);

    const [indicatorRows] = await db.query(
      `SELECT r.clause,r.principleCode,r.isCritical,r.processCodes,
        COALESCE(pe.status,'NOT_EVALUATED') status,
        COALESCE(pe.applicability,'APPLICABLE') applicability,pe.processes
       FROM Requirement r
       LEFT JOIN PcEvaluation pe ON pe.requirementId=r.id AND pe.uocId=? AND pe.scopeType=? AND pe.scopeId=?
       WHERE r.standardId='RSPO' AND COALESCE(r.active,TRUE)=TRUE
       ORDER BY r.sortOrder,r.clause`,
      [uocId, summaryScope.scopeType, summaryScope.scopeId]
    );
    const rows = indicatorRows as EvaluationRow[];
    const compliance = calculateCompliance(rows);
    const principleStats = groupCompliance(rows, row => row.principleCode || `P${String(row.clause).split('.')[0]}`);
    const processExpanded: EvaluationRow[] = [];
    rows.forEach(row => {
      const processes = parseJson<string[]>(row.processes, parseJson<string[]>(row.processCodes, []));
      (processes.length ? processes : ['Sin asignar']).forEach(process => processExpanded.push({ ...row, processes: [process] }));
    });
    const processStats = groupCompliance(processExpanded, row => parseJson<string[]>(row.processes, ['Sin asignar'])[0]);

    const plantationAccess = restrictedFarmPlotSql(req, 'fp.id');
    const [plantationRows] = await db.query(
      `SELECT fp.id farmPlotId,fp.farmName,fp.name,fp.area,ss.name sourceName,
        r.clause,r.principleCode,r.isCritical,r.processCodes,
        COALESCE(pe.status,'NOT_EVALUATED') status,
        COALESCE(pe.applicability,'APPLICABLE') applicability,pe.processes
       FROM FarmPlot fp
       JOIN SupplySource ss ON ss.id=fp.supplySourceId
       CROSS JOIN Requirement r
       LEFT JOIN PcEvaluation pe
         ON pe.uocId=fp.uocId AND pe.requirementId=r.id AND pe.scopeId=fp.id
        AND pe.scopeType=IF(fp.area<=50,'SMALLHOLDER','PLANTATION')
       WHERE fp.uocId=?${plantationAccess.clause} AND r.standardId='RSPO' AND COALESCE(r.active,TRUE)=TRUE
       ORDER BY fp.createdAt,r.sortOrder,r.clause`,
      [uocId, ...plantationAccess.params]
    );
    const plantationGroups = new Map<string, { farmPlot: any; rows: EvaluationRow[] }>();
    (plantationRows as any[]).forEach(row => {
      const current = plantationGroups.get(row.farmPlotId) || {
        farmPlot: {
          id: row.farmPlotId,
          name: row.farmName || row.name,
          sourceName: row.sourceName,
          area: asNumber(row.area),
          profile: asNumber(row.area) <= 50 ? 'SMALLHOLDER' : 'PLANTATION',
          profileLabel: asNumber(row.area) <= 50 ? 'Pequeño productor (≤ 50 ha)' : 'Plantación'
        },
        rows: []
      };
      current.rows.push(row);
      plantationGroups.set(row.farmPlotId, current);
    });
    const plantationCompliance = [...plantationGroups.values()].map(group => ({
      ...group.farmPlot,
      compliance: calculateCompliance(group.rows)
    }));
    const nucleusCompliance = plantationCompliance.length
      ? Math.round(plantationCompliance.reduce((total, item) => total + item.compliance.overall, 0) / plantationCompliance.length)
      : 0;

    const farmMetricScope = restrictedFarmPlotSql(req, 'farmPlotId');
    const plotMetricScope = restrictedFarmPlotSql(req, 'id');
    const sourceScope = req.plantationScope?.restricted
      ? ` AND EXISTS (SELECT 1 FROM FarmPlot scopedPlot
           WHERE scopedPlot.supplySourceId=SupplySource.id
             AND scopedPlot.id IN (${req.plantationScope.farmPlotIds.map(() => '?').join(',')}))`
      : '';
    const countRows = await Promise.all([
      db.query(`SELECT COUNT(*) count,COALESCE(SUM(certifiedArea),0) certifiedArea FROM SupplySource WHERE uocId=? AND status<>?${sourceScope}`, [uocId, 'ARCHIVED', ...(req.plantationScope?.restricted ? req.plantationScope.farmPlotIds : [])]),
      db.query(`SELECT COUNT(*) count FROM FarmPlot WHERE uocId=?${plotMetricScope.clause}`, [uocId, ...plotMetricScope.params]),
      db.query(`SELECT COUNT(*) count FROM NonConformance WHERE uocId=?${farmMetricScope.clause} AND COALESCE(workflowStatus,status)<>'CLOSED'`, [uocId, ...farmMetricScope.params]),
      db.query(`SELECT COUNT(*) count FROM ActionPlan WHERE uocId=?${farmMetricScope.clause} AND status<>'COMPLETED' AND dueDate<NOW()`, [uocId, ...farmMetricScope.params]),
      db.query(`SELECT COUNT(*) count FROM Evidence WHERE uocId=?${farmMetricScope.clause} AND expiryDate IS NOT NULL AND expiryDate<=DATE_ADD(NOW(),INTERVAL 30 DAY)`, [uocId, ...farmMetricScope.params]),
      db.query(`SELECT COUNT(*) count FROM Risk WHERE uocId=?${farmMetricScope.clause} AND LOWER(level)='critical' AND status<>'CLOSED'`, [uocId, ...farmMetricScope.params]),
      db.query(`SELECT COUNT(*) count FROM Audit WHERE uocId=?${farmMetricScope.clause} AND status<>'CLOSED' AND date<=DATE_ADD(NOW(),INTERVAL 60 DAY)`, [uocId, ...farmMetricScope.params]),
      req.plantationScope?.restricted
        ? Promise.resolve([[{ count: 0 }]])
        : db.query("SELECT COUNT(*) count FROM Alert WHERE uocId=? AND dismissed=0", [uocId]),
      req.plantationScope?.restricted
        ? Promise.resolve([[]])
        : db.query('SELECT * FROM ManagementReview WHERE uocId=? ORDER BY reviewDate DESC,createdAt DESC LIMIT 1', [uocId])
    ]) as any[];
    const scalar = (index: number, key = 'count') => asNumber(((countRows[index]?.[0] as any[])?.[0] || {})[key]);
    const alerts = [
      ...(compliance.criticalNonCompliant ? [{ type: 'CRITICAL_INDICATOR', severity: 'CRITICAL', count: compliance.criticalNonCompliant, label: 'Indicadores críticos no conformes' }] : []),
      ...(compliance.criticalPending ? [{ type: 'CRITICAL_PENDING', severity: 'HIGH', count: compliance.criticalPending, label: 'Indicadores críticos pendientes' }] : []),
      ...(scalar(3) ? [{ type: 'OVERDUE_ACTION', severity: 'HIGH', count: scalar(3), label: 'Planes de acción vencidos' }] : []),
      ...(scalar(4) ? [{ type: 'EXPIRING_EVIDENCE', severity: 'MEDIUM', count: scalar(4), label: 'Evidencias próximas a vencer' }] : []),
      ...(scalar(6) ? [{ type: 'UPCOMING_AUDIT', severity: 'MEDIUM', count: scalar(6), label: 'Auditorías próximas' }] : [])
    ];
    const latestReview = ((countRows[8]?.[0] as any[]) || [])[0] || null;
    res.json({
      uoc: {
        ...uoc,
        area: asNumber(uoc.area),
        processingCapacityMt: asNumber(uoc.processingCapacityMt),
        estimatedRffMt: asNumber(uoc.estimatedRffMt),
        processedRffMt: asNumber(uoc.processedRffMt),
        cpoProducedMt: asNumber(uoc.cpoProducedMt),
        pkProducedMt: asNumber(uoc.pkProducedMt)
      },
      metrics: {
        producers: scalar(0),
        plantations: scalar(1),
        certifiedArea: scalar(0, 'certifiedArea'),
        openFindings: scalar(2),
        overdueActions: scalar(3),
        expiringDocuments: scalar(4),
        criticalRisks: scalar(5),
        upcomingAudits: scalar(6),
        activeAlerts: scalar(7)
      },
      compliance,
      plantationCompliance,
      nucleusCompliance,
      principleStats,
      processStats,
      alerts,
      latestManagementReview: latestReview
    });
  } catch (error) {
    console.error('PC summary error', error);
    res.status((error as any)?.statusCode || 500).json({
      error: (error as any)?.message || 'No fue posible cargar el resumen P&C.'
    });
  }
}

export async function getPcIndicators(req: ScopedRequest, res: Response) {
  try {
    const uocId = req.uocId!;
    const scope = await resolvePcScope(req, req.query.farmPlotId);
    const selection = indicatorSelect(scope, uocId);
    const params: any[] = [...selection.params];
    let sql = selection.sql;
    const { principle, status, critical, process, search } = req.query;
    if (principle) { sql += ' AND r.principleCode=?'; params.push(principle); }
    if (status) { sql += " AND COALESCE(pe.status,'NOT_EVALUATED')=?"; params.push(status); }
    if (critical === 'true' || critical === 'false') { sql += ' AND r.isCritical=?'; params.push(critical === 'true' ? 1 : 0); }
    if (process) { sql += ' AND (JSON_SEARCH(COALESCE(pe.processes,r.processCodes),\'one\',?) IS NOT NULL)'; params.push(String(process)); }
    if (search) {
      sql += ' AND (r.clause LIKE ? OR r.title LIKE ? OR r.description LIKE ?)';
      const term = `%${String(search).trim()}%`; params.push(term, term, term);
    }
    sql += ' ORDER BY r.sortOrder,r.clause LIMIT 500';
    const [rows] = await db.query(sql, params);
    res.json({
      scope: {
        scopeType: scope.scopeType,
        scopeId: scope.scopeId,
        farmPlotId: scope.farmPlotId,
        profileLabel: scope.profileLabel,
        farmPlot: scope.farmPlot || null
      },
      indicators: (rows as any[]).map(normalizeIndicator)
    });
  } catch (error) {
    console.error('PC indicators error', error);
    res.status((error as any)?.statusCode || 500).json({ error: (error as any)?.message || 'No fue posible cargar la matriz P&C.' });
  }
}

export async function getPcIndicator(req: ScopedRequest, res: Response) {
  try {
    const uocId = req.uocId!;
    const scope = await resolvePcScope(req, req.query.farmPlotId);
    const selection = indicatorSelect(scope, uocId);
    const [rows] = await db.query(`${selection.sql} AND r.id=? LIMIT 1`, [...selection.params, req.params.id]);
    const indicator = (rows as any[])[0];
    if (!indicator) { res.status(404).json({ error: 'Indicador no encontrado.' }); return; }
    const evidenceScope = scope.farmPlotId ? 'e.farmPlotId=?' : 'e.farmPlotId IS NULL';
    const evidenceLinkScope = scope.farmPlotId ? 'erl.farmPlotId=?' : 'erl.farmPlotId IS NULL';
    const findingScope = scope.farmPlotId ? 'n.farmPlotId=?' : 'n.farmPlotId IS NULL';
    const [evidence, findings, history, actions] = await Promise.all([
      db.query(
        `SELECT DISTINCT e.* FROM Evidence e
         LEFT JOIN EvidenceRequirementLink erl
           ON erl.evidenceId=e.id AND erl.uocId=e.uocId
         WHERE e.uocId=? AND (
           (e.requirementId=? AND ${evidenceScope})
           OR (erl.requirementId=? AND ${evidenceLinkScope})
         )
         ORDER BY e.uploadDate DESC`,
        [
          uocId, req.params.id, ...(scope.farmPlotId ? [scope.farmPlotId] : []),
          req.params.id, ...(scope.farmPlotId ? [scope.farmPlotId] : [])
        ]
      ),
      db.query(`SELECT n.*,a.title auditTitle FROM NonConformance n LEFT JOIN Audit a ON a.id=n.auditId WHERE n.uocId=? AND n.requirementId=? AND ${findingScope} ORDER BY n.createdAt DESC`, [uocId, req.params.id, ...(scope.farmPlotId ? [scope.farmPlotId] : [])]),
      db.query('SELECT h.*,u.name userName FROM PcEvaluationHistory h JOIN User u ON u.id=h.changedBy JOIN PcEvaluation pe ON pe.id=h.evaluationId WHERE h.uocId=? AND pe.requirementId=? AND pe.scopeType=? AND pe.scopeId=? ORDER BY h.createdAt DESC', [uocId, req.params.id, scope.scopeType, scope.scopeId]),
      db.query(`SELECT ap.* FROM ActionPlan ap JOIN NonConformance n ON n.id=ap.nonConformanceId WHERE ap.uocId=? AND n.requirementId=? AND ${findingScope} ORDER BY ap.createdDate DESC`, [uocId, req.params.id, ...(scope.farmPlotId ? [scope.farmPlotId] : [])])
    ]);
    res.json({
      ...normalizeIndicator(indicator),
      scope,
      evidence: evidence[0],
      findings: findings[0],
      history: history[0],
      actionPlans: actions[0]
    });
  } catch (error) {
    console.error('PC indicator detail error', error);
    res.status((error as any)?.statusCode || 500).json({ error: (error as any)?.message || 'No fue posible cargar la ficha del indicador.' });
  }
}

export async function updatePcEvaluation(req: ScopedRequest, res: Response) {
  const uocId = req.uocId!;
  const userId = req.user!.id;
  const {
    status, complianceLevel, responsible, processes, result, observation,
    evaluatedAt, dueDate, noApplyJustification, noApplyEvidenceId
  } = req.body;
  if (!EVALUATION_STATUSES.has(status)) { res.status(400).json({ error: 'Estado de evaluación no válido.' }); return; }
  if (status === 'NOT_APPLICABLE' && (!String(noApplyJustification || '').trim() || !noApplyEvidenceId)) {
    res.status(400).json({ error: 'No aplica requiere justificación y evidencia de soporte.' }); return;
  }
  const connection = await db.getConnection();
  try {
    const scope = await resolvePcScope(req, req.body.farmPlotId || req.query.farmPlotId);
    await connection.beginTransaction();
    const [requirements] = await connection.query("SELECT id FROM Requirement WHERE id=? AND standardId='RSPO' AND COALESCE(active,TRUE)=TRUE", [req.params.id]);
    if (!(requirements as any[]).length) { await connection.rollback(); res.status(404).json({ error: 'Indicador no encontrado.' }); return; }
    if (noApplyEvidenceId) {
      const evidenceScope = scope.farmPlotId ? 'e.farmPlotId=?' : 'e.farmPlotId IS NULL';
      const evidenceLinkScope = scope.farmPlotId ? 'erl.farmPlotId=?' : 'erl.farmPlotId IS NULL';
      const [evidence] = await connection.query(
        `SELECT e.id FROM Evidence e
         WHERE e.id=? AND e.uocId=? AND (
           (e.requirementId=? AND ${evidenceScope})
           OR EXISTS (
             SELECT 1 FROM EvidenceRequirementLink erl
             WHERE erl.evidenceId=e.id AND erl.uocId=e.uocId
               AND erl.requirementId=? AND ${evidenceLinkScope}
           )
         )`,
        [
          noApplyEvidenceId, uocId,
          req.params.id, ...(scope.farmPlotId ? [scope.farmPlotId] : []),
          req.params.id, ...(scope.farmPlotId ? [scope.farmPlotId] : [])
        ]
      );
      if (!(evidence as any[]).length) { await connection.rollback(); res.status(400).json({ error: 'La evidencia de soporte no pertenece al indicador y UoC.' }); return; }
    }
    const [currentRows] = await connection.query(
      'SELECT * FROM PcEvaluation WHERE uocId=? AND requirementId=? AND scopeType=? AND scopeId=? FOR UPDATE',
      [uocId, req.params.id, scope.scopeType, scope.scopeId]
    );
    const current = (currentRows as any[])[0];
    const evaluationId = current?.id || uuidv4();
    const requestedNoApply = status === 'NOT_APPLICABLE';
    const storedStatus = requestedNoApply ? 'PENDING_VERIFICATION' : status;
    const applicability = requestedNoApply ? 'PENDING_APPROVAL' : 'APPLICABLE';
    await connection.query(
      `INSERT INTO PcEvaluation
       (id,uocId,requirementId,scopeType,scopeId,farmPlotId,applicability,status,complianceLevel,responsible,processes,result,observation,evaluatedAt,evaluatorId,dueDate,noApplyJustification,noApplyEvidenceId)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE applicability=VALUES(applicability),status=VALUES(status),
       complianceLevel=VALUES(complianceLevel),responsible=VALUES(responsible),processes=VALUES(processes),
       result=VALUES(result),observation=VALUES(observation),evaluatedAt=VALUES(evaluatedAt),
       evaluatorId=VALUES(evaluatorId),dueDate=VALUES(dueDate),noApplyJustification=VALUES(noApplyJustification),
       noApplyEvidenceId=VALUES(noApplyEvidenceId),noApplyApprovedBy=NULL,noApplyApprovedAt=NULL`,
      [evaluationId, uocId, req.params.id, scope.scopeType, scope.scopeId, scope.farmPlotId,
        applicability, storedStatus, complianceLevel ?? null, responsible || null,
        JSON.stringify(Array.isArray(processes) ? processes : []), result || null, observation || null,
        evaluatedAt || null, userId, dueDate || null, noApplyJustification || null, noApplyEvidenceId || null]
    );
    const [updatedRows] = await connection.query('SELECT * FROM PcEvaluation WHERE id=?', [evaluationId]);
    const updated = (updatedRows as any[])[0];
    await connection.query(
      'INSERT INTO PcEvaluationHistory (id,evaluationId,uocId,changedBy,action,previousStatus,newStatus,comment,snapshotJson) VALUES (?,?,?,?,?,?,?,?,?)',
      [uuidv4(), evaluationId, uocId, userId, requestedNoApply ? 'REQUEST_NOT_APPLICABLE' : current ? 'UPDATE_EVALUATION' : 'CREATE_EVALUATION',
        current?.status || null, updated.status, observation || null, JSON.stringify(updated)]
    );
    await connection.commit();
    res.json({ ...updated, processes: parseJson(updated.processes, []) });
  } catch (error) {
    await connection.rollback();
    console.error('PC evaluation update error', error);
    res.status(500).json({ error: 'No fue posible guardar la evaluación.' });
  } finally {
    connection.release();
  }
}

export async function approvePcNoApplicability(req: ScopedRequest, res: Response) {
  const connection = await db.getConnection();
  try {
    const scope = await resolvePcScope(req, req.body.farmPlotId || req.query.farmPlotId);
    await connection.beginTransaction();
    const [rows] = await connection.query(
      'SELECT * FROM PcEvaluation WHERE uocId=? AND requirementId=? AND scopeType=? AND scopeId=? FOR UPDATE',
      [req.uocId, req.params.id, scope.scopeType, scope.scopeId]
    );
    const current = (rows as any[])[0];
    if (!current || current.applicability !== 'PENDING_APPROVAL') {
      await connection.rollback(); res.status(400).json({ error: 'No existe una solicitud de No aplica pendiente.' }); return;
    }
    const approved = req.body.approved !== false;
    const nextStatus = approved ? 'NOT_APPLICABLE' : 'IN_PROGRESS';
    const nextApplicability = approved ? 'NOT_APPLICABLE' : 'APPLICABLE';
    await connection.query(
      'UPDATE PcEvaluation SET status=?,applicability=?,noApplyApprovedBy=?,noApplyApprovedAt=? WHERE id=?',
      [nextStatus, nextApplicability, approved ? req.user!.id : null, approved ? new Date() : null, current.id]
    );
    const [updatedRows] = await connection.query('SELECT * FROM PcEvaluation WHERE id=?', [current.id]);
    const updated = (updatedRows as any[])[0];
    await connection.query(
      'INSERT INTO PcEvaluationHistory (id,evaluationId,uocId,changedBy,action,previousStatus,newStatus,comment,snapshotJson) VALUES (?,?,?,?,?,?,?,?,?)',
      [uuidv4(), current.id, req.uocId, req.user!.id, approved ? 'APPROVE_NOT_APPLICABLE' : 'REJECT_NOT_APPLICABLE',
        current.status, nextStatus, req.body.comment || null, JSON.stringify(updated)]
    );
    await connection.commit();
    res.json(updated);
  } catch (error) {
    await connection.rollback();
    console.error('PC applicability approval error', error);
    res.status(500).json({ error: 'No fue posible registrar la aprobación.' });
  } finally {
    connection.release();
  }
}

const reviewFields = [
  'reviewDate','participantsJson','auditResults','objectivesStatus','indicatorsSummary','legalCompliance',
  'risksSummary','findingsSummary','actionPlansSummary','complaintsSummary','socialPerformance',
  'environmentalPerformance','laborPerformance','ghgPerformance','resourcesSummary','changesSummary',
  'improvementNeeds','decisions','responsible','dueDate','minutesEvidenceId','status','progress'
];

function reviewValues(body: any) {
  return reviewFields.map(field => field === 'participantsJson'
    ? JSON.stringify(Array.isArray(body[field]) ? body[field] : [])
    : body[field] ?? null);
}

export async function getManagementReviews(req: ScopedRequest, res: Response) {
  const [rows] = await db.query('SELECT * FROM ManagementReview WHERE uocId=? ORDER BY reviewDate DESC,createdAt DESC', [req.uocId]);
  res.json((rows as any[]).map(row => ({ ...row, participantsJson: parseJson(row.participantsJson, []) })));
}

export async function createManagementReview(req: ScopedRequest, res: Response) {
  if (!req.body.reviewDate) { res.status(400).json({ error: 'La fecha de revisión es obligatoria.' }); return; }
  const status = req.body.status || 'DRAFT';
  if (!MANAGEMENT_STATUSES.has(status)) { res.status(400).json({ error: 'Estado no válido.' }); return; }
  const id = uuidv4();
  const body = { ...req.body, status, progress: Math.max(0, Math.min(100, asNumber(req.body.progress))) };
  await db.query(
    `INSERT INTO ManagementReview (${['id','uocId',...reviewFields,'createdBy'].join(',')})
     VALUES (${Array(3 + reviewFields.length).fill('?').join(',')})`,
    [id, req.uocId, ...reviewValues(body), req.user!.id]
  );
  const [rows] = await db.query('SELECT * FROM ManagementReview WHERE id=? AND uocId=?', [id, req.uocId]);
  const review = (rows as any[])[0];
  await db.query(
    'INSERT INTO ManagementReviewHistory (id,managementReviewId,uocId,changedBy,action,snapshotJson) VALUES (?,?,?,?,?,?)',
    [uuidv4(), id, req.uocId, req.user!.id, 'CREATE', JSON.stringify(review)]
  );
  res.status(201).json(review);
}

export async function updateManagementReview(req: ScopedRequest, res: Response) {
  const entries = reviewFields
    .filter(field => req.body[field] !== undefined)
    .map(field => [field, field === 'participantsJson' ? JSON.stringify(req.body[field] || []) : req.body[field]]);
  if (!entries.length) { res.status(400).json({ error: 'No hay cambios para guardar.' }); return; }
  if (req.body.status && !MANAGEMENT_STATUSES.has(req.body.status)) { res.status(400).json({ error: 'Estado no válido.' }); return; }
  const [result]: any = await db.query(
    `UPDATE ManagementReview SET ${entries.map(([field]) => `${field}=?`).join(',')} WHERE id=? AND uocId=?`,
    [...entries.map(([, value]) => value), req.params.id, req.uocId]
  );
  if (!result.affectedRows) { res.status(404).json({ error: 'Revisión no encontrada.' }); return; }
  const [rows] = await db.query('SELECT * FROM ManagementReview WHERE id=? AND uocId=?', [req.params.id, req.uocId]);
  const review = (rows as any[])[0];
  await db.query(
    'INSERT INTO ManagementReviewHistory (id,managementReviewId,uocId,changedBy,action,snapshotJson) VALUES (?,?,?,?,?,?)',
    [uuidv4(), req.params.id, req.uocId, req.user!.id, 'UPDATE', JSON.stringify(review)]
  );
  res.json(review);
}

function csvEscape(value: unknown) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

async function getReportContext(req: ScopedRequest) {
  const scope = await resolvePcScope(req, req.query.farmPlotId);
  const selection = indicatorSelect(scope, req.uocId!);
  const [[uocRows], [userRows], [matrixRows]] = await Promise.all([
    db.query('SELECT name,companyName,certificationCode FROM CertificationUnit WHERE id=?', [req.uocId]),
    db.query('SELECT name,email FROM User WHERE id=?', [req.user!.id]),
    db.query(`${selection.sql} ORDER BY r.sortOrder,r.clause`, selection.params)
  ]);
  return {
    uoc: (uocRows as any[])[0] || {},
    user: (userRows as any[])[0] || {},
    rows: matrixRows as any[],
    scope,
    generatedAt: new Date()
  };
}

export async function exportPcCsv(req: ScopedRequest, res: Response) {
  const { uoc, user, rows, generatedAt } = await getReportContext(req);
  const header = ['Código','Principio','Criterio','Indicador','Crítico','Estado','Aplicabilidad','Responsable','Procesos','Evidencias','Hallazgos'];
  const lines = rows.map(row => [
    row.clause,row.principleCode,row.criterionCode,row.title,row.isCritical ? 'Sí' : 'No',
    row.status,row.applicability,row.responsible,parseJson<string[]>(row.processes, []).join(' | '),
    row.evidenceCount,row.findingCount
  ].map(csvEscape).join(';'));
  const metadata = [
    ['Unidad de Certificación', uoc.name],
    ['Empresa', uoc.companyName],
    ['Código de certificación', uoc.certificationCode || 'Por registrar'],
    ['Versión del estándar', 'RSPO P&C 2024 v4.2'],
    ['Fecha de generación', generatedAt.toISOString()],
    ['Generado por', user.name || user.email]
  ].map(line => line.map(csvEscape).join(';'));
  const csv = `\uFEFF${metadata.join('\r\n')}\r\n\r\n${header.map(csvEscape).join(';')}\r\n${lines.join('\r\n')}`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="matriz-pc-${req.uocId}.csv"`);
  res.send(csv);
}

function xmlEscape(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export async function exportPcExcel(req: ScopedRequest, res: Response) {
  const { uoc, user, rows, generatedAt } = await getReportContext(req);
  const headers = ['Código','Principio','Criterio','Indicador','Crítico','Estado','Aplicabilidad','Responsable','Procesos','Evidencias','Hallazgos'];
  const recordRows = rows.map(row => [
    row.clause,row.principleCode,row.criterionCode,row.title,row.isCritical ? 'Sí' : 'No',
    row.status,row.applicability,row.responsible,parseJson<string[]>(row.processes, []).join(' | '),
    row.evidenceCount,row.findingCount
  ]);
  const cell = (value: unknown, style = '') => `<Cell${style ? ` ss:StyleID="${style}"` : ''}><Data ss:Type="String">${xmlEscape(value)}</Data></Cell>`;
  const rowXml = (values: unknown[], style = '') => `<Row>${values.map(value => cell(value, style)).join('')}</Row>`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#174B35" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Meta"><Font ss:Bold="1" ss:Color="#174B35"/></Style>
 </Styles>
 <Worksheet ss:Name="Matriz P&amp;C"><Table>
  ${rowXml(['Cumplimiento P&C – Unidad de Certificación'], 'Header')}
  ${rowXml(['Unidad de Certificación', uoc.name], 'Meta')}
  ${rowXml(['Empresa', uoc.companyName])}
  ${rowXml(['Código de certificación', uoc.certificationCode || 'Por registrar'])}
  ${rowXml(['Versión del estándar', 'RSPO P&C 2024 v4.2'])}
  ${rowXml(['Fecha de generación', generatedAt.toISOString()])}
  ${rowXml(['Generado por', user.name || user.email])}
  <Row/>
  ${rowXml(headers, 'Header')}
  ${recordRows.map(row => rowXml(row)).join('')}
 </Table></Worksheet>
</Workbook>`;
  res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="matriz-pc-${req.uocId}.xls"`);
  res.send(`\uFEFF${xml}`);
}

function pdfSafe(value: unknown) {
  return String(value ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ').replace(/([\\()])/g, '\\$1');
}

function buildSimplePdf(lines: string[]) {
  const shown = lines.slice(0, 46);
  const content = [
    'BT', '/F1 11 Tf', '50 790 Td',
    ...shown.flatMap((line, index) => [
      index === 0 ? '/F1 16 Tf' : index === 1 ? '/F1 11 Tf' : '',
      `(${pdfSafe(line).slice(0, 105)}) Tj`,
      '0 -16 Td'
    ]).filter(Boolean),
    'ET'
  ].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets[index + 1] = Buffer.byteLength(pdf, 'latin1');
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}

export async function exportPcExecutivePdf(req: ScopedRequest, res: Response) {
  const { uoc, user, rows, generatedAt } = await getReportContext(req);
  const normalized = rows as EvaluationRow[];
  const compliance = calculateCompliance(normalized);
  const principles = groupCompliance(normalized, row => row.principleCode || `P${String(row.clause).split('.')[0]}`);
  const statusLabel: Record<string, string> = {
    COMPLIANT: 'Cumple', CLOSED: 'Cerrado', PARTIAL: 'Parcial', IN_PROGRESS: 'En gestion',
    PENDING_VERIFICATION: 'Pendiente de verificacion', NON_COMPLIANT: 'No cumple',
    NOT_EVALUATED: 'No evaluado', NOT_APPLICABLE: 'No aplica'
  };
  const lines = [
    'INFORME EJECUTIVO DE CUMPLIMIENTO P&C',
    `Unidad de Certificacion: ${uoc.name || ''}`,
    `Empresa: ${uoc.companyName || ''}`,
    `Codigo: ${uoc.certificationCode || 'Por registrar'}`,
    'Estandar: RSPO P&C 2024 v4.2',
    `Fecha: ${generatedAt.toISOString().slice(0, 10)} | Generado por: ${user.name || user.email || ''}`,
    '',
    `Cumplimiento condicionado: ${compliance.overall}%`,
    `Puntaje base: ${compliance.baseScore}%`,
    `Indicadores aplicables: ${compliance.applicable} de ${compliance.total}`,
    `Criticos conformes: ${compliance.criticalCompliant} de ${compliance.criticalTotal}`,
    `Criticos pendientes: ${compliance.criticalPending}`,
    `Criticos no conformes: ${compliance.criticalNonCompliant}`,
    '',
    'CUMPLIMIENTO POR PRINCIPIO',
    ...principles.map(item => `${item.name}: ${item.overall}% (${item.applicable} aplicables)`),
    '',
    'INDICADORES CON BRECHA',
    ...rows.filter(row => ['NON_COMPLIANT','PARTIAL','PENDING_VERIFICATION'].includes(row.status))
      .slice(0, 18).map(row => `${row.clause} - ${row.title}: ${statusLabel[row.status] || row.status}`)
  ];
  const pdf = buildSimplePdf(lines);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="informe-ejecutivo-pc-${req.uocId}.pdf"`);
  res.send(pdf);
}
