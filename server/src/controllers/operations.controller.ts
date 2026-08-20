import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import {
  PlantationScopedRequest,
  canAccessFarmPlot,
  canEditFarmPlot,
  restrictedFarmPlotSql
} from '../middleware/plantation.middleware';

const MODULES = new Set(['SST', 'TRAINING', 'ENVIRONMENT', 'SOCIAL']);
const STATUSES = new Set(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED']);

const fail = (res: Response, status: number, error: string) => res.status(status).json({ error });
const nullableNumber = (value: unknown) => value === '' || value == null
  ? null
  : Number.isFinite(Number(value)) ? Number(value) : null;

function parseData(value: unknown) {
  if (value == null || value === '') return {};
  if (typeof value === 'object') return value;
  try { return JSON.parse(String(value)); } catch { return {}; }
}

function calculatedResult(numerator: unknown, denominator: unknown, explicit: unknown) {
  const num = nullableNumber(numerator);
  const den = nullableNumber(denominator);
  if (num != null && den != null && den > 0) return Number((num / den * 100).toFixed(4));
  return nullableNumber(explicit);
}

async function resolveFarmPlotId(req: PlantationScopedRequest, value: unknown, write = false) {
  let farmPlotId = String(value || '').trim() || null;
  if (req.plantationScope?.restricted && !farmPlotId && req.plantationScope.farmPlotIds.length === 1) {
    farmPlotId = req.plantationScope.farmPlotIds[0];
  }
  if (farmPlotId && !(write ? canEditFarmPlot(req, farmPlotId) : canAccessFarmPlot(req, farmPlotId))) {
    throw Object.assign(new Error(write
      ? 'No tiene permiso para modificar registros de esta plantación.'
      : 'No tiene acceso a esta plantación.'), { statusCode: 403 });
  }
  if (write && req.plantationScope?.restricted && !farmPlotId) {
    throw Object.assign(new Error('Seleccione una plantación asignada.'), { statusCode: 400 });
  }
  return farmPlotId;
}

function normalize(row: any) {
  return {
    ...row,
    targetValue: nullableNumber(row.targetValue),
    numeratorValue: nullableNumber(row.numeratorValue),
    denominatorValue: nullableNumber(row.denominatorValue),
    resultValue: nullableNumber(row.resultValue),
    data: parseData(row.dataJson),
    evidence: Array.isArray(row.evidence) ? row.evidence : [],
    dataJson: undefined
  };
}

export async function listOperationalRecords(req: PlantationScopedRequest, res: Response) {
  try {
    const moduleCode = String(req.query.moduleCode || '').toUpperCase();
    if (moduleCode && !MODULES.has(moduleCode)) return fail(res, 400, 'Módulo operativo no válido.');
    const requestedFarmPlotId = await resolveFarmPlotId(req, req.query.farmPlotId, false);
    const params: any[] = [req.uocId];
    let sql = `
      SELECT o.*,COALESCE(fp.farmName,fp.name) plantationName,pl.name lotName
      FROM OperationalRecord o
      LEFT JOIN FarmPlot fp ON fp.id=o.farmPlotId
      LEFT JOIN PlantationLot pl ON pl.id=o.plantationLotId
      WHERE o.uocId=?`;
    if (requestedFarmPlotId) { sql += ' AND o.farmPlotId=?'; params.push(requestedFarmPlotId); }
    const access = restrictedFarmPlotSql(req, 'o.farmPlotId');
    sql += access.clause;
    params.push(...access.params);
    if (moduleCode) { sql += ' AND o.moduleCode=?'; params.push(moduleCode); }
    if (req.query.category) { sql += ' AND o.category=?'; params.push(String(req.query.category)); }
    sql += ' ORDER BY COALESCE(o.completedDate,o.scheduledDate) DESC,o.createdAt DESC';
    const [rows] = await db.query(sql, params);
    const ids = (rows as any[]).map(row => row.id);
    const [linkRows] = ids.length
      ? await db.query(
        `SELECT ore.operationalRecordId,e.id,e.title,e.status,e.originalFileName,e.fileName
         FROM OperationalRecordEvidence ore
         JOIN Evidence e ON e.id=ore.evidenceId
         WHERE ore.operationalRecordId IN (${ids.map(() => '?').join(',')})`,
        ids
      )
      : [[] as any[]];
    res.json((rows as any[]).map(row => normalize({
      ...row,
      evidence: (linkRows as any[]).filter(link => link.operationalRecordId === row.id)
    })));
  } catch (error) {
    res.status((error as any)?.statusCode || 500).json({
      error: (error as any)?.message || 'No fue posible cargar los registros operativos.'
    });
  }
}

export async function getOperationalSummary(req: PlantationScopedRequest, res: Response) {
  try {
    const requestedFarmPlotId = await resolveFarmPlotId(req, req.query.farmPlotId, false);
    const params: any[] = [req.uocId];
    let farmFilter = '';
    if (requestedFarmPlotId) { farmFilter = ' AND farmPlotId=?'; params.push(requestedFarmPlotId); }
    const access = restrictedFarmPlotSql(req, 'farmPlotId');
    farmFilter += access.clause;
    params.push(...access.params);
    const [rows] = await db.query(
      `SELECT moduleCode,
        COUNT(*) total,
        SUM(status='COMPLETED') completed,
        SUM(status IN ('PLANNED','IN_PROGRESS')) pending,
        SUM(status='OVERDUE' OR (status<>'COMPLETED' AND scheduledDate<CURDATE())) overdue,
        ROUND(AVG(resultValue),2) averageResult
       FROM OperationalRecord
       WHERE uocId=?${farmFilter}
       GROUP BY moduleCode`,
      params
    );
    res.json({ modules: rows });
  } catch (error) {
    res.status((error as any)?.statusCode || 500).json({
      error: (error as any)?.message || 'No fue posible calcular los indicadores operativos.'
    });
  }
}

export async function createOperationalRecord(req: PlantationScopedRequest, res: Response) {
  try {
    const moduleCode = String(req.body.moduleCode || '').toUpperCase();
    const category = String(req.body.category || '').trim();
    const title = String(req.body.title || '').trim();
    if (!MODULES.has(moduleCode) || !category || !title) {
      return fail(res, 400, 'Módulo, categoría y título son obligatorios.');
    }
    const farmPlotId = await resolveFarmPlotId(req, req.body.farmPlotId, true);
    const plantationLotId = String(req.body.plantationLotId || '').trim() || null;
    if (farmPlotId) {
      const [plots] = await db.query('SELECT id FROM FarmPlot WHERE id=? AND uocId=?', [farmPlotId, req.uocId]);
      if (!(plots as any[]).length) return fail(res, 400, 'La plantación no pertenece a la UoC.');
    }
    if (plantationLotId) {
      const [lots] = await db.query(
        'SELECT id FROM PlantationLot WHERE id=? AND farmPlotId=? AND uocId=?',
        [plantationLotId, farmPlotId, req.uocId]
      );
      if (!(lots as any[]).length) return fail(res, 400, 'El lote no pertenece a la plantación.');
    }
    const status = String(req.body.status || 'PLANNED');
    if (!STATUSES.has(status)) return fail(res, 400, 'Estado no válido.');
    const resultValue = calculatedResult(
      req.body.numeratorValue,
      req.body.denominatorValue,
      req.body.resultValue
    );
    const id = uuidv4();
    await db.query(
      `INSERT INTO OperationalRecord
       (id,uocId,farmPlotId,plantationLotId,moduleCode,category,title,description,
        responsible,scheduledDate,completedDate,status,targetValue,numeratorValue,
        denominatorValue,resultValue,unit,dataJson,createdBy,updatedBy)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id, req.uocId, farmPlotId, plantationLotId, moduleCode, category, title,
        req.body.description || null, req.body.responsible || null,
        req.body.scheduledDate || null, req.body.completedDate || null, status,
        nullableNumber(req.body.targetValue), nullableNumber(req.body.numeratorValue),
        nullableNumber(req.body.denominatorValue), resultValue, req.body.unit || null,
        JSON.stringify(parseData(req.body.data)), req.user!.id, req.user!.id
      ]
    );
    const [rows] = await db.query('SELECT * FROM OperationalRecord WHERE id=?', [id]);
    await db.query(
      `INSERT INTO SystemChangeLog
       (id,uocId,farmPlotId,entityType,entityId,action,changedBy,snapshotJson)
       VALUES (?,?,?,?,?,?,?,?)`,
      [uuidv4(), req.uocId, farmPlotId, 'OperationalRecord', id, 'CREATED', req.user!.id, JSON.stringify((rows as any[])[0])]
    );
    res.status(201).json(normalize((rows as any[])[0]));
  } catch (error) {
    res.status((error as any)?.statusCode || 500).json({
      error: (error as any)?.message || 'No fue posible crear el registro.'
    });
  }
}

export async function updateOperationalRecord(req: PlantationScopedRequest, res: Response) {
  try {
    const [rows] = await db.query(
      'SELECT * FROM OperationalRecord WHERE id=? AND uocId=?',
      [req.params.id, req.uocId]
    );
    const current = (rows as any[])[0];
    if (!current) return fail(res, 404, 'Registro no encontrado.');
    await resolveFarmPlotId(req, current.farmPlotId, true);
    const allowed = [
      'category','title','description','responsible','scheduledDate','completedDate',
      'status','targetValue','numeratorValue','denominatorValue','unit'
    ];
    const entries = allowed
      .filter(key => req.body[key] !== undefined)
      .map(key => [key, req.body[key]]);
    if (req.body.status && !STATUSES.has(String(req.body.status))) {
      return fail(res, 400, 'Estado no válido.');
    }
    if (req.body.data !== undefined) entries.push(['dataJson', JSON.stringify(parseData(req.body.data))]);
    const nextNumerator = req.body.numeratorValue ?? current.numeratorValue;
    const nextDenominator = req.body.denominatorValue ?? current.denominatorValue;
    const nextResult = calculatedResult(nextNumerator, nextDenominator, req.body.resultValue ?? current.resultValue);
    entries.push(['resultValue', nextResult], ['updatedBy', req.user!.id]);
    await db.query(
      `UPDATE OperationalRecord SET ${entries.map(([key]) => `${key}=?`).join(',')}
       WHERE id=? AND uocId=?`,
      [...entries.map(([, value]) => value), req.params.id, req.uocId]
    );
    const [updatedRows] = await db.query('SELECT * FROM OperationalRecord WHERE id=?', [req.params.id]);
    await db.query(
      `INSERT INTO SystemChangeLog
       (id,uocId,farmPlotId,entityType,entityId,action,changedBy,snapshotJson)
       VALUES (?,?,?,?,?,?,?,?)`,
      [uuidv4(), req.uocId, current.farmPlotId, 'OperationalRecord', req.params.id, 'UPDATED', req.user!.id, JSON.stringify((updatedRows as any[])[0])]
    );
    res.json(normalize((updatedRows as any[])[0]));
  } catch (error) {
    res.status((error as any)?.statusCode || 500).json({
      error: (error as any)?.message || 'No fue posible actualizar el registro.'
    });
  }
}

export async function linkOperationalEvidence(req: PlantationScopedRequest, res: Response) {
  try {
    const [recordRows] = await db.query(
      'SELECT * FROM OperationalRecord WHERE id=? AND uocId=?',
      [req.params.id, req.uocId]
    );
    const record = (recordRows as any[])[0];
    if (!record) return fail(res, 404, 'Registro no encontrado.');
    await resolveFarmPlotId(req, record.farmPlotId, true);
    const [evidenceRows] = await db.query(
      `SELECT id,farmPlotId FROM Evidence
       WHERE id=? AND uocId=? AND (farmPlotId<=>?)`,
      [req.body.evidenceId, req.uocId, record.farmPlotId]
    );
    if (!(evidenceRows as any[]).length) {
      return fail(res, 400, 'La evidencia no pertenece al mismo alcance del registro.');
    }
    await db.query(
      `INSERT IGNORE INTO OperationalRecordEvidence
       (operationalRecordId,evidenceId) VALUES (?,?)`,
      [record.id, req.body.evidenceId]
    );
    res.status(201).json({ operationalRecordId: record.id, evidenceId: req.body.evidenceId });
  } catch (error) {
    res.status((error as any)?.statusCode || 500).json({
      error: (error as any)?.message || 'No fue posible vincular la evidencia.'
    });
  }
}
