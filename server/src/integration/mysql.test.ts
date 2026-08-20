import test from 'node:test';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';

const url = process.env.TEST_DATABASE_URL;
const integration = url ? test : test.skip;

integration('MySQL: esquema y tablas RSPO TECH disponibles', async () => {
  const db = mysql.createPool(url!);
  try {
    const required = [
      'UserCertificationUnit','UserPlantationAccess','SupplySource','SupplySourceHistory',
      'FarmPlot','PlantationActivity','RffDelivery','TraceabilityAlert','PrismaOperation',
      'PrismaAdjustment','PrismaAttachment','PlantRecord','ActionPlanHistory',
      'EvidenceRequirementLink','OperationalRecord','OperationalRecordEvidence','SystemChangeLog'
    ];
    const [rows] = await db.query(`SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (${required.map(()=>'?').join(',')})`, required);
    assert.equal((rows as any[]).length, required.length);
  } finally { await db.end(); }
});

integration('MySQL: asignaciones TEST aíslan MANAGER y AUDITOR', async () => {
  const db = mysql.createPool(url!);
  try {
    const [manager] = await db.query(`SELECT ucu.uocId FROM UserCertificationUnit ucu WHERE ucu.userId='test-user-manager-000000000000001'`);
    const [auditor] = await db.query(`SELECT ucu.uocId FROM UserCertificationUnit ucu WHERE ucu.userId='test-user-auditor-000000000000001'`);
    assert.deepEqual((manager as any[]).map(x=>x.uocId), ['test-uoc-a-00000000000000000000001']);
    assert.deepEqual((auditor as any[]).map(x=>x.uocId), ['test-uoc-b-00000000000000000000001']);
  } finally { await db.end(); }
});

integration('MySQL: áreas, plantaciones y actividades TEST persisten', async () => {
  const db = mysql.createPool(url!);
  try {
    const [sources] = await db.query(`SELECT totalArea,plantedArea,certifiedArea FROM SupplySource WHERE id LIKE 'test-%'`);
    assert.ok((sources as any[]).length >= 6);
    assert.ok((sources as any[]).every(x => Number(x.totalArea) >= Number(x.plantedArea) && Number(x.plantedArea) >= Number(x.certifiedArea)));
    const [activities] = await db.query(`SELECT id FROM PlantationActivity WHERE id LIKE 'test-%'`);
    assert.ok((activities as any[]).length >= 2);
  } finally { await db.end(); }
});

integration('MySQL: el portal de plantación queda limitado a su plantación asignada', async () => {
  const db = mysql.createPool(url!);
  try {
    const [rows] = await db.query(`
      SELECT upa.farmPlotId,upa.accessLevel,fp.uocId
      FROM UserPlantationAccess upa
      JOIN FarmPlot fp ON fp.id=upa.farmPlotId
      WHERE upa.userId='test-user-limited-000000000000001' AND upa.status='ACTIVE'`);
    assert.deepEqual(rows, [{
      farmPlotId: 'test-plot-a-000000000000000000001',
      accessLevel: 'OPERATOR',
      uocId: 'test-uoc-a-00000000000000000000001'
    }]);
  } finally { await db.end(); }
});

integration('MySQL: evidencias reutilizables y módulos operativos conservan alcance', async () => {
  const db = mysql.createPool(url!);
  try {
    const [links] = await db.query(`
      SELECT erl.requirementId,erl.farmPlotId
      FROM EvidenceRequirementLink erl
      WHERE erl.evidenceId='test-evidence-00000000000000000001'`);
    assert.equal((links as any[])[0]?.requirementId, 'test-requirement-0000000000000001');
    assert.equal((links as any[])[0]?.farmPlotId, 'test-plot-a-000000000000000000001');
    const [operations] = await db.query(`
      SELECT moduleCode,category,resultValue,farmPlotId
      FROM OperationalRecord WHERE id='test-operation-sst-00000000000001'`);
    assert.equal((operations as any[])[0]?.moduleCode, 'SST');
    assert.equal(Number((operations as any[])[0]?.resultValue), 1);
    assert.equal((operations as any[])[0]?.farmPlotId, 'test-plot-a-000000000000000000001');
  } finally { await db.end(); }
});

integration('MySQL: entrega aceptada tiene SCC y entrega en revisión no', async () => {
  const db = mysql.createPool(url!);
  try {
    const [rows] = await db.query(`SELECT status,sccTransactionId,netWeightKg,grossWeightKg-tareWeightKg calculated FROM RffDelivery WHERE id LIKE 'test-rff-%' ORDER BY status`);
    assert.ok((rows as any[]).every(x => Number(x.netWeightKg) === Number(x.calculated)));
    const accepted = (rows as any[]).find(x=>x.status==='ACCEPTED');
    const review = (rows as any[]).find(x=>x.status==='REVIEW');
    assert.ok(accepted?.sccTransactionId);
    assert.equal(review?.sccTransactionId, null);
  } finally { await db.end(); }
});

integration('MySQL: historial PRISMA y plan de acción TEST persisten', async () => {
  const db = mysql.createPool(url!);
  try {
    const [adjustments] = await db.query(`SELECT adjustmentType FROM PrismaAdjustment WHERE id LIKE 'test-%'`);
    assert.equal((adjustments as any[]).length, 3);
    const [plans] = await db.query(`SELECT eficacia,uocId FROM ActionPlan WHERE id='test-action-plan-00000000000000001'`);
    assert.equal((plans as any[])[0]?.uocId, 'test-uoc-a-00000000000000000000001');
    assert.ok((plans as any[])[0]?.eficacia);
  } finally { await db.end(); }
});
