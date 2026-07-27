import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

const url = process.env.TEST_DATABASE_URL;
const password = process.env.TEST_SEED_PASSWORD;
if (!url) throw new Error('TEST_DATABASE_URL es obligatoria. El seed nunca usa DATABASE_URL.');
if (!password || password.length < 10) throw new Error('TEST_SEED_PASSWORD debe tener al menos 10 caracteres y no se guarda en el repositorio.');

const db = mysql.createPool(url);
const ids = {
  uocA:'test-uoc-a-00000000000000000000001', uocB:'test-uoc-b-00000000000000000000001',
  admin:'test-user-admin-00000000000000001', manager:'test-user-manager-000000000000001',
  auditor:'test-user-auditor-000000000000001', user:'test-user-limited-000000000000001',
  own:'test-source-own-000000000000000001', associated:'test-source-associated-00000000001',
  independent:'test-source-independent-000000001', group:'test-source-group-0000000000000001',
  ineligible:'test-source-ineligible-00000000001', conventional:'test-source-conventional-000000001',
  plotA:'test-plot-a-000000000000000000001', plotB:'test-plot-b-000000000000000000001',
  requirement:'test-requirement-0000000000000001', evidence:'test-evidence-00000000000000000001',
  audit:'test-audit-0000000000000000000001', finding:'test-finding-000000000000000000001',
  plan:'test-action-plan-00000000000000001', prisma:'test-prisma-operation-0000000000001'
};

async function seed() {
  const hash = await bcrypt.hash(password!, 10);
  await db.query(`INSERT INTO Standard (id,name,fullName,description,color,icon)
    VALUES ('RSPO','RSPO','Roundtable on Sustainable Palm Oil','TEST estándar RSPO','#14532d','leaf')
    ON DUPLICATE KEY UPDATE name=VALUES(name)`);
  await db.query(`INSERT INTO CertificationUnit (id,name,companyName,country,area,status,type) VALUES
    (?, 'TEST UoC A', 'TEST PALMA A', 'Colombia',100,'ACTIVE','MIXED'),
    (?, 'TEST UoC B', 'TEST PALMA B', 'Colombia',80,'ACTIVE','PLANTATION')
    ON DUPLICATE KEY UPDATE name=VALUES(name)`, [ids.uocA,ids.uocB]);
  for (const [id,email,name,role] of [
    [ids.admin,'test.admin@example.invalid','TEST ADMIN','ADMIN'],
    [ids.manager,'test.manager@example.invalid','TEST MANAGER A','MANAGER'],
    [ids.auditor,'test.auditor@example.invalid','TEST AUDITOR B','AUDITOR'],
    [ids.user,'test.user@example.invalid','TEST USER A','USER']
  ]) await db.query(`INSERT INTO User (id,email,password,name,role) VALUES (?,?,?,?,?)
    ON DUPLICATE KEY UPDATE password=VALUES(password),name=VALUES(name),role=VALUES(role)`,[id,email,hash,name,role]);
  await db.query(`INSERT IGNORE INTO UserCertificationUnit (userId,uocId) VALUES (?,?),(?,?),(?,?)`,
    [ids.manager,ids.uocA,ids.auditor,ids.uocB,ids.user,ids.uocA]);
  const sources = [
    [ids.own,'TEST FUENTE PROPIA','TEST-OWN','OWN','ELIGIBLE','CERTIFIED'],
    [ids.associated,'TEST FUENTE ASOCIADA','TEST-ASSOC','ASSOCIATED','ELIGIBLE','CERTIFIED'],
    [ids.independent,'TEST FUENTE INDEPENDIENTE','TEST-IND','INDEPENDENT','CONDITIONAL','CONVENTIONAL'],
    [ids.group,'TEST GRUPO PEQUEÑOS','TEST-GROUP','SMALLHOLDER_GROUP','ELIGIBLE','CERTIFIED'],
    [ids.ineligible,'TEST FUENTE NO ELEGIBLE','TEST-NO','INDIVIDUAL','INELIGIBLE','CONVENTIONAL'],
    [ids.conventional,'TEST FUENTE CONVENCIONAL','TEST-CONV','ASSOCIATION','ELIGIBLE','CONVENTIONAL']
  ];
  for (const s of sources) await db.query(`INSERT INTO SupplySource
    (id,uocId,name,identifier,sourceType,totalArea,plantedArea,certifiedArea,eligibilityStatus,certificationStatus,status)
    VALUES (?,?,?,?,?,20,15,10,?,?,'ACTIVE') ON DUPLICATE KEY UPDATE name=VALUES(name)`,[s[0],ids.uocA,...s.slice(1)]);
  await db.query(`INSERT INTO FarmPlot (id,uocId,supplySourceId,name,farmName,area,plantedArea,estimatedProductionMt,eligibilityStatus,certificationStatus)
    VALUES (?,?,?,'TEST LOTE A','TEST PREDIO A',10,8,20,'ELIGIBLE','CERTIFIED'),
           (?,?,?,'TEST LOTE B','TEST PREDIO B',8,6,8,'INELIGIBLE','CONVENTIONAL')
    ON DUPLICATE KEY UPDATE estimatedProductionMt=VALUES(estimatedProductionMt)`,
    [ids.plotA,ids.uocA,ids.own,ids.plotB,ids.uocA,ids.ineligible]);
  await db.query(`INSERT INTO Requirement (id,clause,title,description,status,evidenceCount,standardId)
    VALUES (?,'TEST-1','TEST requisito','TEST requisito ficticio','PARTIAL',1,'RSPO')
    ON DUPLICATE KEY UPDATE title=VALUES(title)`,[ids.requirement]);
  await db.query(`INSERT INTO Evidence (id,title,description,standardId,clause,type,status,uocId,companyName,farmPlotId,requirementId,responsible,observations)
    VALUES (?,'TEST evidencia','TEST sin archivo real','RSPO','TEST-1','RECORD','VALID',?,'TEST PALMA A',?,?,?,'TEST seed')
    ON DUPLICATE KEY UPDATE description=VALUES(description)`,[ids.evidence,ids.uocA,ids.plotA,ids.requirement,ids.manager]);
  await db.query(`INSERT INTO Audit (id,title,date,type,auditorName,status,uocId)
    VALUES (?,'TEST auditoría',CURRENT_DATE,'INTERNAL','TEST AUDITOR','IN_PROGRESS',?)
    ON DUPLICATE KEY UPDATE status=VALUES(status)`,[ids.audit,ids.uocA]);
  await db.query(`INSERT INTO NonConformance (id,auditId,requirementId,type,description,status,uocId)
    VALUES (?,?,?,'MINOR_NC','TEST hallazgo','OPEN',?)
    ON DUPLICATE KEY UPDATE description=VALUES(description)`,[ids.finding,ids.audit,ids.requirement,ids.uocA]);
  await db.query(`INSERT INTO ActionPlan
    (id,title,description,type,status,priority,assigneeId,dueDate,progress,nonConformanceId,brecha,causaRaiz,correccion,eficacia,uocId)
    VALUES (?,'TEST plan','TEST acción correctiva','CORRECTIVE','IN_PROGRESS','HIGH',?,DATE_ADD(CURRENT_DATE,INTERVAL 30 DAY),50,?,'TEST brecha','TEST causa','TEST corrección','TEST eficacia pendiente',?)
    ON DUPLICATE KEY UPDATE progress=VALUES(progress)`,[ids.plan,ids.manager,ids.finding,ids.uocA]);
  await db.query(`INSERT INTO PlantationActivity (id,uocId,farmPlotId,category,title,status,score,isCritical,responsible,activityDate)
    VALUES ('test-activity-eval-000000000000001',?,?,'EVALUATION','TEST evaluación','COMPLIANT',85,1,'TEST MANAGER',CURRENT_DATE),
           ('test-activity-gap-0000000000000001',?,?,'GAP','TEST BPA','COMPLETED',NULL,0,'TEST MANAGER',CURRENT_DATE)
    ON DUPLICATE KEY UPDATE status=VALUES(status)`,[ids.uocA,ids.plotA,ids.uocA,ids.plotA]);
  await db.query(`INSERT INTO SccTransaction (id,uocId,type,productType,supplyModel,volumeMt,batchRef,counterparty,documentRef,notes,createdBy)
    VALUES ('test-scc-accepted-000000000000001',?,'RECEPTION','RFF','MB',10,'TEST-LOT-ACCEPT','TEST FUENTE PROPIA','TEST-TICKET-ACCEPT','TEST aceptada',?)
    ON DUPLICATE KEY UPDATE volumeMt=VALUES(volumeMt)`,[ids.uocA,ids.manager]);
  await db.query(`INSERT INTO RffDelivery
    (id,uocId,supplySourceId,farmPlotId,deliveredAt,traceabilityLot,plate,weighTicket,grossWeightKg,tareWeightKg,netWeightKg,volumeMt,supplyModel,fruitCondition,eligibleAtDelivery,estimatedProductionMt,accumulatedDeliveredMt,varianceMt,status,sccTransactionId,createdBy)
    VALUES
    ('test-rff-accepted-000000000000001',?,?,?,NOW(),'TEST-RFF-ACCEPT','TEST01','TEST-TICKET-ACCEPT',15000,5000,10000,10,'MB','CERTIFIED',1,20,10,10,'ACCEPTED','test-scc-accepted-000000000000001',?),
    ('test-rff-review-0000000000000001',?,?,?,NOW(),'TEST-RFF-REVIEW','TEST02','TEST-TICKET-REVIEW',12000,4000,8000,8,'MB','CERTIFIED',0,8,8,0,'REVIEW',NULL,?)
    ON DUPLICATE KEY UPDATE status=VALUES(status)`,
    [ids.uocA,ids.own,ids.plotA,ids.manager,ids.uocA,ids.ineligible,ids.plotB,ids.manager]);
  await db.query(`INSERT INTO PrismaOperation (id,uocId,operationType,internalReference,product,supplyModel,volumeMt,physicalDate,status,responsibleId,observations)
    VALUES (?,?,'SHIPPING_ANNOUNCEMENT','TEST-PRISMA-001','CPO','MB',12,CURRENT_DATE,'ADJUSTED',?,'TEST interno')
    ON DUPLICATE KEY UPDATE status=VALUES(status)`,[ids.prisma,ids.uocA,ids.manager]);
  for (const [id,type,oldV,newV,reason] of [
    ['test-prisma-confirm-00000000000001','CONFIRMATION',12,12,'TEST confirmación'],
    ['test-prisma-remove-000000000000001','REMOVE',12,0,'TEST remove'],
    ['test-prisma-adjust-000000000000001','ADJUSTMENT',12,11,'TEST ajuste']
  ]) await db.query(`INSERT INTO PrismaAdjustment (id,operationId,adjustmentType,previousVolumeMt,newVolumeMt,reason,createdBy)
    VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE reason=VALUES(reason)`,[id,ids.prisma,type,oldV,newV,reason,ids.manager]);
  console.log('TEST seed cargado de forma idempotente.');
}

async function clean() {
  const tables = ['PrismaAdjustment','PrismaAttachment','PrismaOperation','ActionPlanHistory','ActionPlan','NonConformance','Audit','PlantationActivity','TraceabilityAlert','RffDelivery','SccTransaction','Evidence','FarmPlot','SupplySourceHistory','SupplySource','UserCertificationUnit','User','CertificationUnit'];
  for (const table of tables) {
    const key = table === 'UserCertificationUnit' ? 'userId' : 'id';
    await db.query(`DELETE FROM \`${table}\` WHERE \`${key}\` LIKE 'test-%'`).catch(() => undefined);
  }
  console.log('Datos TEST retirados.');
}

async function count() {
  for (const table of ['CertificationUnit','User','UserCertificationUnit','SupplySource','FarmPlot','PlantationActivity','Evidence','Audit','NonConformance','ActionPlan','PrismaOperation','PrismaAdjustment','RffDelivery','SccTransaction']) {
    const key = table === 'UserCertificationUnit' ? 'userId' : 'id';
    const [rows] = await db.query(`SELECT COUNT(*) count FROM \`${table}\` WHERE \`${key}\` LIKE 'test-%'`);
    console.log(`${table}: ${(rows as any[])[0].count}`);
  }
}

const command = process.argv[2] || 'seed';
async function main() {
  try {
    if (command === 'seed') await seed();
    else if (command === 'clean') await clean();
    else if (command === 'count') await count();
    else throw new Error('Use seed, clean o count.');
  } finally { await db.end(); }
}
main().catch(error => { console.error(error); process.exit(1); });
