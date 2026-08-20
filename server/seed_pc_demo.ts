import db from './src/db';

const sourceRows = [
  ['c1000000-0000-4000-8000-000000000001','DEMO · Agropecuaria La Rivera S.A.S.','DEMO-PROD-001','ASSOCIATED',120,110,100,'Sandra Méndez'],
  ['c1000000-0000-4000-8000-000000000002','DEMO · Productor Carlos Moreno','DEMO-PROD-002','INDEPENDENT',85,78,70,'Carlos Moreno'],
  ['c1000000-0000-4000-8000-000000000003','DEMO · Palmas del Horizonte S.A.S.','DEMO-PROD-003','PROPRIETARY',210,195,185,'Diana Rojas'],
  ['c1000000-0000-4000-8000-000000000004','DEMO · Asociación Sembrando Futuro','DEMO-PROD-004','SMALLHOLDERS',38,36,32,'Héctor Pardo'],
  ['c1000000-0000-4000-8000-000000000005','DEMO · Productora La Esperanza S.A.S.','DEMO-PROD-005','ASSOCIATED',145,138,125,'Natalia Torres']
] as const;

const plotRows = [
  ['c2000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','Plantación La Rivera',120,110,2160],
  ['c2000000-0000-4000-8000-000000000002','c1000000-0000-4000-8000-000000000002','Plantación El Porvenir',85,78,1460],
  ['c2000000-0000-4000-8000-000000000003','c1000000-0000-4000-8000-000000000003','Plantación Horizonte',210,195,3820],
  ['c2000000-0000-4000-8000-000000000004','c1000000-0000-4000-8000-000000000004','Plantación Nuevo Amanecer',38,36,650],
  ['c2000000-0000-4000-8000-000000000005','c1000000-0000-4000-8000-000000000005','Plantación La Esperanza',145,138,2680]
] as const;

const statuses = [
  ['COMPLIANT', 100], ['PARTIAL', 55], ['NON_COMPLIANT', 0], ['IN_PROGRESS', 30],
  ['COMPLIANT', 100], ['PENDING_VERIFICATION', 60], ['COMPLIANT', 100],
  ['NOT_APPLICABLE', null], ['PARTIAL', 70], ['NOT_EVALUATED', null],
  ['COMPLIANT', 100], ['IN_PROGRESS', 25]
] as const;

async function main() {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [uocRows] = await connection.query(
      "SELECT id FROM CertificationUnit WHERE status<>'INACTIVE' ORDER BY createdAt LIMIT 1"
    );
    const [userRows] = await connection.query(
      "SELECT id,name FROM User WHERE role IN ('SUPERADMIN','ADMIN','MANAGER') ORDER BY FIELD(role,'SUPERADMIN','ADMIN','MANAGER'),createdAt LIMIT 1"
    );
    const uocId = (uocRows as any[])[0]?.id;
    const user = (userRows as any[])[0];
    if (!uocId || !user) throw new Error('Se requiere una UoC activa y un usuario administrador para cargar la demostración.');

    await connection.query(
      `UPDATE CertificationUnit SET
       millName=COALESCE(NULLIF(millName,''),companyName),
       membershipNumber=COALESCE(NULLIF(membershipNumber,''),'DEMO-RSPO-001'),
       certificationCode=COALESCE(NULLIF(certificationCode,''),'DEMO-CERT-2026'),
       certificationBody=COALESCE(NULLIF(certificationBody,''),'Organismo certificador por confirmar'),
       certificationType=COALESCE(NULLIF(certificationType,''),'Principios y Criterios'),
       scopeDescription=COALESCE(NULLIF(scopeDescription,''),'Planta extractora, base de suministro y plantaciones vinculadas a la UoC.'),
       processingCapacityMt=IF(processingCapacityMt=0,180000,processingCapacityMt),
       estimatedRffMt=IF(estimatedRffMt=0,11200,estimatedRffMt),
       processedRffMt=IF(processedRffMt=0,9860,processedRffMt),
       cpoProducedMt=IF(cpoProducedMt=0,2071, cpoProducedMt),
       pkProducedMt=IF(pkProducedMt=0,493,pkProducedMt)
       WHERE id=?`,
      [uocId]
    );

    for (const row of sourceRows) {
      await connection.query(
        `INSERT INTO SupplySource
         (id,uocId,name,identifier,sourceType,totalArea,plantedArea,certifiedArea,polygonStatus,riskLevel,eligibilityStatus,certificationStatus,responsible,lastEvaluation,expiryDate,notes,status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_DATE,DATE_ADD(CURRENT_DATE,INTERVAL 1 YEAR),?,'ACTIVE')
         ON DUPLICATE KEY UPDATE uocId=VALUES(uocId),name=VALUES(name),totalArea=VALUES(totalArea),
         plantedArea=VALUES(plantedArea),certifiedArea=VALUES(certifiedArea),responsible=VALUES(responsible)`,
        [row[0],uocId,row[1],row[2],row[3],row[4],row[5],row[6],'VALIDATED','LOW','ELIGIBLE','IN_PROCESS',row[7],
          'Registro ficticio identificado como DEMO; no corresponde a un productor real.']
      );
    }
    for (const row of plotRows) {
      await connection.query(
        `INSERT INTO FarmPlot
         (id,uocId,supplySourceId,name,farmName,area,plantedArea,estimatedProductionMt,eligibilityStatus,certificationStatus,pcWorkflowState,pcLastUpdatedAt)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,NOW())
         ON DUPLICATE KEY UPDATE uocId=VALUES(uocId),name=VALUES(name),area=VALUES(area),
         plantedArea=VALUES(plantedArea),estimatedProductionMt=VALUES(estimatedProductionMt)`,
        [row[0],uocId,row[1],row[2],row[2],row[3],row[4],row[5],'ELIGIBLE','IN_PROCESS','IN_PROGRESS']
      );
    }

    const [requirementRows] = await connection.query(
      "SELECT id,clause,processCodes FROM Requirement WHERE standardId='RSPO' AND active=1 ORDER BY sortOrder,clause LIMIT 12"
    );
    const requirements = requirementRows as any[];
    if (requirements.length < 12) throw new Error('La matriz RSPO no contiene suficientes indicadores.');

    const evidenceIds = [
      'c3000000-0000-4000-8000-000000000001',
      'c3000000-0000-4000-8000-000000000002',
      'c3000000-0000-4000-8000-000000000003'
    ];
    const evidenceDefinitions = [
      [evidenceIds[0], requirements[0], 'DEMO · Política de transparencia aprobada', 'APPROVED'],
      [evidenceIds[1], requirements[2], 'DEMO · Plan de cierre de brecha', 'IN_REVIEW'],
      [evidenceIds[2], requirements[7], 'DEMO · Estudio de aplicabilidad', 'APPROVED']
    ];
    for (const [id, requirement, title, status] of evidenceDefinitions as any[]) {
      await connection.query(
        `INSERT INTO Evidence
         (id,title,description,standardId,clause,type,status,uocId,companyName,requirementId,indicator,responsible,
          originalFileName,mimeType,observations,documentDate,evidenceVersion,processCode,entityType,entityId,reviewedBy,reviewedAt)
         SELECT ?,?,'Documento ficticio para validar el flujo funcional.','RSPO',?,'DOCUMENT',?,cu.id,cu.companyName,?,?,?,
          'archivo-demostracion.pdf','application/pdf','Evidencia identificada expresamente como DEMO.',CURRENT_DATE,'1.0','Gestión documental','UOC',cu.id,?,NOW()
         FROM CertificationUnit cu WHERE cu.id=?
         ON DUPLICATE KEY UPDATE title=VALUES(title),status=VALUES(status),requirementId=VALUES(requirementId)`,
        [id,title,requirement.clause,status,requirement.id,requirement.clause,user.name,user.id,uocId]
      );
    }

    for (let index = 0; index < requirements.length; index += 1) {
      const requirement = requirements[index];
      const [status, level] = statuses[index];
      const isNoApply = status === 'NOT_APPLICABLE';
      const evaluationId = `c9${String(index + 1).padStart(7,'0')}-0000-4000-8000-${String(index + 1).padStart(12,'0')}`;
      await connection.query(
        `INSERT INTO PcEvaluation
         (id,uocId,requirementId,applicability,status,complianceLevel,responsible,processes,result,observation,
          evaluatedAt,evaluatorId,dueDate,noApplyJustification,noApplyEvidenceId,noApplyApprovedBy,noApplyApprovedAt)
         VALUES (?,?,?,?,?,?,?,?,?,?,CURRENT_DATE,?,DATE_ADD(CURRENT_DATE,INTERVAL 45 DAY),?,?,?,?)
         ON DUPLICATE KEY UPDATE applicability=VALUES(applicability),status=VALUES(status),
         complianceLevel=VALUES(complianceLevel),responsible=VALUES(responsible),processes=VALUES(processes),
         result=VALUES(result),observation=VALUES(observation),evaluatedAt=VALUES(evaluatedAt),
         evaluatorId=VALUES(evaluatorId),dueDate=VALUES(dueDate),
         noApplyJustification=VALUES(noApplyJustification),noApplyEvidenceId=VALUES(noApplyEvidenceId),
         noApplyApprovedBy=VALUES(noApplyApprovedBy),noApplyApprovedAt=VALUES(noApplyApprovedAt)`,
        [evaluationId,uocId,requirement.id,isNoApply ? 'NOT_APPLICABLE' : 'APPLICABLE',status,level,user.name,
          requirement.processCodes || JSON.stringify(['Gestión documental']),
          `Resultado de demostración para ${requirement.clause}.`,
          'Registro ficticio identificado como DEMO para comprobar filtros, cálculos e historial.',
          user.id,isNoApply ? 'El requisito no aplica al alcance demostrativo y cuenta con soporte aprobado.' : null,
          isNoApply ? evidenceIds[2] : null,isNoApply ? user.id : null,isNoApply ? new Date() : null]
      );
      await connection.query(
        `INSERT IGNORE INTO PcEvaluationHistory
         (id,evaluationId,uocId,changedBy,action,previousStatus,newStatus,comment,snapshotJson)
         VALUES (?,?,?,?,?,NULL,?,?,?)`,
        [`ca${String(index + 1).padStart(7,'0')}-0000-4000-8000-${String(index + 1).padStart(12,'0')}`,
          evaluationId,uocId,user.id,'DEMO_SEED',status,'Carga demostrativa identificada.',JSON.stringify({ status, level, demo: true })]
      );
    }

    const smallholderPlotId = plotRows[3][0];
    const smallholderStatuses = [
      ['COMPLIANT', 100],
      ['PARTIAL', 65],
      ['IN_PROGRESS', 35]
    ] as const;
    for (let index = 0; index < smallholderStatuses.length; index += 1) {
      const requirement = requirements[index];
      const [status, level] = smallholderStatuses[index];
      const evaluationId = `cb${String(index + 1).padStart(7,'0')}-0000-4000-8000-${String(index + 1).padStart(12,'0')}`;
      await connection.query(
        `INSERT INTO PcEvaluation
         (id,uocId,requirementId,scopeType,scopeId,farmPlotId,applicability,status,complianceLevel,responsible,
          processes,result,observation,evaluatedAt,evaluatorId,dueDate)
         VALUES (?,?,?,'SMALLHOLDER',?,?,'APPLICABLE',?,?,?,?,?,?,CURRENT_DATE,?,DATE_ADD(CURRENT_DATE,INTERVAL 45 DAY))
         ON DUPLICATE KEY UPDATE scopeType=VALUES(scopeType),scopeId=VALUES(scopeId),farmPlotId=VALUES(farmPlotId),
         applicability=VALUES(applicability),status=VALUES(status),complianceLevel=VALUES(complianceLevel),
         responsible=VALUES(responsible),processes=VALUES(processes),result=VALUES(result),
         observation=VALUES(observation),evaluatedAt=VALUES(evaluatedAt),evaluatorId=VALUES(evaluatorId),
         dueDate=VALUES(dueDate)`,
        [evaluationId,uocId,requirement.id,smallholderPlotId,smallholderPlotId,status,level,user.name,
          requirement.processCodes || JSON.stringify(['Gestión del núcleo']),
          `Resultado de demostración para pequeño productor en ${requirement.clause}.`,
          'Evaluación DEMO aislada de la planta extractora y de las demás plantaciones.',
          user.id]
      );
    }

    const smallholderEvidence = [
      ['cc000000-0000-4000-8000-000000000001', 'DEMO · Registro de visita al pequeño productor', 'visita-pequeno-productor.pdf'],
      ['cc000000-0000-4000-8000-000000000002', 'DEMO · Evidencia fotográfica del predio', 'fotografias-predio.zip']
    ] as const;
    for (const [id, title, fileName] of smallholderEvidence) {
      await connection.query(
        `INSERT INTO Evidence
         (id,title,description,standardId,clause,type,status,uocId,companyName,requirementId,farmPlotId,indicator,
          responsible,originalFileName,mimeType,observations,documentDate,evidenceVersion,processCode,entityType,
          entityId,reviewedBy,reviewedAt)
         SELECT ?,?,'Evidencia ficticia para comprobar adjuntos múltiples por indicador.','RSPO',?,'DOCUMENT',
          'APPROVED',cu.id,cu.companyName,?,?,?,?,?,'application/octet-stream',
          'Evidencia identificada expresamente como DEMO.',CURRENT_DATE,'1.0','Gestión del núcleo',
          'FARM_PLOT',?,?,NOW()
         FROM CertificationUnit cu WHERE cu.id=?
         ON DUPLICATE KEY UPDATE title=VALUES(title),requirementId=VALUES(requirementId),
          farmPlotId=VALUES(farmPlotId),status=VALUES(status)`,
        [id,title,requirements[0].clause,requirements[0].id,smallholderPlotId,requirements[0].clause,
          user.name,fileName,smallholderPlotId,user.id,uocId]
      );
    }

    const auditId = 'c4000000-0000-4000-8000-000000000001';
    const findingId = 'c5000000-0000-4000-8000-000000000001';
    const actionId = 'c6000000-0000-4000-8000-000000000001';
    await connection.query(
      `INSERT INTO Audit (id,title,date,type,auditorName,status,uocId,scopeDescription,criteriaDescription,auditTeamJson,processesJson,samplingDescription)
       VALUES (?,'DEMO · Auditoría interna P&C',DATE_ADD(NOW(),INTERVAL 30 DAY),'INTERNAL',?,'SCHEDULED',?,
       'Planta extractora, suministro y muestra de plantaciones.','RSPO P&C 2024 v4.2',JSON_ARRAY(?),
       JSON_ARRAY('Planta extractora','Base de suministro'),'Muestra demostrativa de cinco productores.')
       ON DUPLICATE KEY UPDATE date=VALUES(date),uocId=VALUES(uocId),auditorName=VALUES(auditorName)`,
      [auditId,user.name,uocId,user.name]
    );
    await connection.query(
      `INSERT INTO NonConformance
       (id,auditId,requirementId,type,description,status,uocId,code,source,classification,objectiveEvidence,responsible,dueDate,workflowStatus)
       VALUES (?,?,?,'MINOR_NC','DEMO · Falta completar la divulgación de un registro de control.','OPEN',?,
       'DEMO-NC-001','Auditoría interna','Menor','Muestra documental revisada.',?,DATE_ADD(CURRENT_DATE,INTERVAL 25 DAY),'OPEN')
       ON DUPLICATE KEY UPDATE requirementId=VALUES(requirementId),uocId=VALUES(uocId),responsible=VALUES(responsible)`,
      [findingId,auditId,requirements[2].id,uocId,user.name]
    );
    await connection.query(
      `INSERT INTO ActionPlan
       (id,title,description,type,status,priority,assigneeId,dueDate,progress,nonConformanceId,uocId,brecha,causaRaiz,correccion)
       VALUES (?,'DEMO · Completar divulgación documental','Publicar y verificar el registro faltante.','CORRECTIVE','IN_PROGRESS','HIGH',?,
       DATE_ADD(NOW(),INTERVAL 25 DAY),35,?,?,'Registro pendiente de divulgar.','Control documental incompleto.','Actualizar repositorio y comunicar.')
       ON DUPLICATE KEY UPDATE assigneeId=VALUES(assigneeId),uocId=VALUES(uocId),dueDate=VALUES(dueDate)`,
      [actionId,user.id,findingId,uocId]
    );
    await connection.query(
      `INSERT INTO ManagementReview
       (id,uocId,reviewDate,participantsJson,auditResults,objectivesStatus,indicatorsSummary,legalCompliance,
        risksSummary,findingsSummary,actionPlansSummary,improvementNeeds,decisions,responsible,dueDate,status,progress,createdBy)
       VALUES ('c7000000-0000-4000-8000-000000000001',?,CURRENT_DATE,JSON_ARRAY(?),
       'Auditoría interna programada; un hallazgo demostrativo abierto.','Objetivos en seguimiento.',
       'Evaluaciones mixtas para validar el cálculo condicionado por criticidad.','Matriz legal en revisión.',
       'Sin riesgos reales cargados; escenario de demostración.','Un hallazgo menor DEMO.','Una acción correctiva en curso.',
       'Fortalecer control documental.','Completar la acción antes de la auditoría.',?,DATE_ADD(CURRENT_DATE,INTERVAL 30 DAY),'IN_REVIEW',45,?)
       ON DUPLICATE KEY UPDATE reviewDate=VALUES(reviewDate),responsible=VALUES(responsible),progress=VALUES(progress)`,
      [uocId,user.name,user.name,user.id]
    );
    await connection.query(
      `INSERT INTO Alert (id,title,message,type,priority,action,module,uocId,dismissed)
       VALUES ('c8000000-0000-4000-8000-000000000001','DEMO · Acción próxima a vencer',
       'Revise el plan de acción demostrativo antes de la auditoría interna.','warning','alta','#pc/findings','plant',?,0)
       ON DUPLICATE KEY UPDATE uocId=VALUES(uocId),dismissed=0`,
      [uocId]
    );

    await connection.commit();
    const [[sourceCount], [plotCount], [evaluationCount]] = await Promise.all([
      connection.query('SELECT COUNT(*) count FROM SupplySource WHERE uocId=?', [uocId]),
      connection.query('SELECT COUNT(*) count FROM FarmPlot WHERE uocId=?', [uocId]),
      connection.query('SELECT COUNT(*) count FROM PcEvaluation WHERE uocId=?', [uocId])
    ]);
    console.log(JSON.stringify({
      uocId,
      sources: (sourceCount as any[])[0].count,
      plantations: (plotCount as any[])[0].count,
      evaluations: (evaluationCount as any[])[0].count,
      demoData: true
    }));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await db.end();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
