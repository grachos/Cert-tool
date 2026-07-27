import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import { ScopedRequest } from '../middleware/uoc.middleware';

const fail = (res: Response, status: number, error: string) => res.status(status).json({ error });
const cleanNumber = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
export const calculateDeliveryWeights = (grossValue: unknown, tareValue: unknown) => {
  const gross = cleanNumber(grossValue);
  const tare = cleanNumber(tareValue);
  if (gross <= tare || tare < 0) throw new Error('El peso bruto debe ser mayor que la tara.');
  const netWeightKg = Number((gross - tare).toFixed(3));
  return { grossWeightKg: gross, tareWeightKg: tare, netWeightKg, volumeMt: netWeightKg / 1000 };
};

export const listSupplySources = async (req: ScopedRequest, res: Response) => {
  const [rows] = await db.query('SELECT * FROM SupplySource WHERE uocId = ? ORDER BY createdAt DESC', [req.uocId]);
  res.json(rows);
};

export const createSupplySource = async (req: ScopedRequest, res: Response) => {
  const { name, identifier, sourceType, totalArea, plantedArea, certifiedArea, polygonReference, polygonStatus, riskLevel, eligibilityStatus, certificationStatus, responsible, lastEvaluation, expiryDate, notes } = req.body;
  if (!name?.trim() || !identifier?.trim() || !sourceType) return fail(res, 400, 'Nombre, identificador y tipo son obligatorios.');
  const id = uuidv4();
  await db.query(
    `INSERT INTO SupplySource (id,uocId,name,identifier,sourceType,totalArea,plantedArea,certifiedArea,polygonReference,polygonStatus,riskLevel,eligibilityStatus,certificationStatus,responsible,lastEvaluation,expiryDate,notes)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, req.uocId, name.trim(), identifier.trim(), sourceType, cleanNumber(totalArea), cleanNumber(plantedArea), cleanNumber(certifiedArea), polygonReference || null, polygonStatus || 'PENDING', riskLevel || 'MEDIUM', eligibilityStatus || 'PENDING', certificationStatus || 'PENDING', responsible || null, lastEvaluation || null, expiryDate || null, notes || null]
  );
  const [rows] = await db.query('SELECT * FROM SupplySource WHERE id = ?', [id]);
  res.status(201).json((rows as any[])[0]);
};

export const updateSupplySource = async (req: ScopedRequest, res: Response) => {
  const { id } = req.params;
  const allowed = ['name','identifier','sourceType','totalArea','plantedArea','certifiedArea','polygonReference','polygonStatus','riskLevel','eligibilityStatus','certificationStatus','responsible','lastEvaluation','expiryDate','notes'];
  const entries = allowed.filter(key => req.body[key] !== undefined).map(key => [key, req.body[key]]);
  if (!entries.length) return fail(res, 400, 'No hay cambios para guardar.');
  await db.query(`UPDATE SupplySource SET ${entries.map(([key]) => `${key} = ?`).join(', ')} WHERE id = ? AND uocId = ?`, [...entries.map(([, value]) => value), id, req.uocId]);
  const [rows] = await db.query('SELECT * FROM SupplySource WHERE id = ? AND uocId = ?', [id, req.uocId]);
  if (!(rows as any[]).length) return fail(res, 404, 'Registro no encontrado.');
  res.json((rows as any[])[0]);
};

export const listFarmPlots = async (req: ScopedRequest, res: Response) => {
  const [rows] = await db.query(
    `SELECT fp.*, ss.name AS sourceName, ss.sourceType,
      COALESCE(ROUND(AVG(CASE WHEN pa.category='EVALUATION' THEN pa.score END),2),0) AS compliance,
      SUM(CASE WHEN pa.isCritical=1 AND pa.status NOT IN ('COMPLETED','COMPLIANT','CLOSED') THEN 1 ELSE 0 END) AS criticalRequirements
     FROM FarmPlot fp JOIN SupplySource ss ON ss.id=fp.supplySourceId
     LEFT JOIN PlantationActivity pa ON pa.farmPlotId=fp.id
     WHERE fp.uocId=? GROUP BY fp.id ORDER BY fp.createdAt DESC`, [req.uocId]
  );
  res.json(rows);
};

export const createFarmPlot = async (req: ScopedRequest, res: Response) => {
  const { supplySourceId, name, farmName, area, plantedArea, estimatedProductionMt, eligibilityStatus, certificationStatus, polygonReference } = req.body;
  if (!supplySourceId || !name?.trim()) return fail(res, 400, 'Fuente de suministro y nombre son obligatorios.');
  const [source] = await db.query('SELECT id FROM SupplySource WHERE id=? AND uocId=?', [supplySourceId, req.uocId]);
  if (!(source as any[]).length) return fail(res, 400, 'La fuente no pertenece a la UoC.');
  const id = uuidv4();
  await db.query(
    `INSERT INTO FarmPlot (id,uocId,supplySourceId,name,farmName,area,plantedArea,estimatedProductionMt,eligibilityStatus,certificationStatus,polygonReference)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [id, req.uocId, supplySourceId, name.trim(), farmName || null, cleanNumber(area), cleanNumber(plantedArea), cleanNumber(estimatedProductionMt), eligibilityStatus || 'PENDING', certificationStatus || 'PENDING', polygonReference || null]
  );
  const [rows] = await db.query('SELECT * FROM FarmPlot WHERE id=?', [id]);
  res.status(201).json((rows as any[])[0]);
};

export const listPlantationActivities = async (req: ScopedRequest, res: Response) => {
  const { farmPlotId, category } = req.query;
  let sql = 'SELECT pa.*, fp.name AS plotName, fp.farmName FROM PlantationActivity pa JOIN FarmPlot fp ON fp.id=pa.farmPlotId WHERE pa.uocId=?';
  const params: any[] = [req.uocId];
  if (farmPlotId) { sql += ' AND pa.farmPlotId=?'; params.push(farmPlotId); }
  if (category) { sql += ' AND pa.category=?'; params.push(category); }
  sql += ' ORDER BY pa.activityDate DESC, pa.createdAt DESC';
  const [rows] = await db.query(sql, params);
  res.json(rows);
};

export const createPlantationActivity = async (req: ScopedRequest, res: Response) => {
  const { farmPlotId, category, title, description, requirementId, status, score, isCritical, responsible, activityDate, dueDate } = req.body;
  if (!farmPlotId || !category || !title?.trim()) return fail(res, 400, 'Plantación, categoría y título son obligatorios.');
  const [plot] = await db.query('SELECT id FROM FarmPlot WHERE id=? AND uocId=?', [farmPlotId, req.uocId]);
  if (!(plot as any[]).length) return fail(res, 400, 'La plantación no pertenece a la UoC.');
  const id = uuidv4();
  await db.query(
    `INSERT INTO PlantationActivity (id,uocId,farmPlotId,category,title,description,requirementId,status,score,isCritical,responsible,activityDate,dueDate)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, req.uocId, farmPlotId, category, title.trim(), description || null, requirementId || null, status || 'PENDING', score ?? null, Boolean(isCritical), responsible || null, activityDate || null, dueDate || null]
  );
  const [rows] = await db.query('SELECT * FROM PlantationActivity WHERE id=?', [id]);
  res.status(201).json((rows as any[])[0]);
};

export const listDeliveries = async (req: ScopedRequest, res: Response) => {
  const [rows] = await db.query(
    `SELECT d.*, ss.name AS sourceName, fp.name AS plotName,
      (SELECT COUNT(*) FROM TraceabilityAlert a WHERE a.deliveryId=d.id AND a.status='OPEN') AS openAlerts
     FROM RffDelivery d JOIN SupplySource ss ON ss.id=d.supplySourceId
     LEFT JOIN FarmPlot fp ON fp.id=d.farmPlotId
     WHERE d.uocId=? ORDER BY d.deliveredAt DESC`, [req.uocId]
  );
  res.json(rows);
};

export const createDelivery = async (req: ScopedRequest, res: Response) => {
  const data = req.body;
  let weights;
  try { weights = calculateDeliveryWeights(data.grossWeightKg, data.tareWeightKg); } catch { return fail(res, 400, 'Origen, fecha, lote, placa, tiquete y pesos válidos son obligatorios.'); }
  const { grossWeightKg: gross, tareWeightKg: tare, netWeightKg: net } = weights;
  if (!data.supplySourceId || !data.deliveredAt || !data.traceabilityLot || !data.plate || !data.weighTicket) {
    return fail(res, 400, 'Origen, fecha, lote, placa, tiquete y pesos válidos son obligatorios.');
  }
  const [sources] = await db.query('SELECT * FROM SupplySource WHERE id=? AND uocId=?', [data.supplySourceId, req.uocId]);
  const source = (sources as any[])[0];
  if (!source) return fail(res, 400, 'La fuente no pertenece a la UoC.');
  const accumulated = cleanNumber(data.accumulatedDeliveredMt) + net / 1000;
  const estimated = cleanNumber(data.estimatedProductionMt);
  const variance = Number((estimated - accumulated).toFixed(3));
  const eligible = source.eligibilityStatus === 'ELIGIBLE';
  const certified = source.certificationStatus === 'CERTIFIED';
  const alerts: Array<{ type: string; message: string; severity: string }> = [];
  if (!eligible) alerts.push({ type: 'INELIGIBLE', message: 'La fuente no era elegible en la fecha de entrega.', severity: 'CRITICAL' });
  if (estimated > 0 && accumulated > estimated) alerts.push({ type: 'OVERPRODUCTION', message: 'La entrega acumulada supera la producción estimada.', severity: 'HIGH' });
  if (data.fruitCondition === 'CERTIFIED' && !certified) alerts.push({ type: 'CERTIFICATION_MISMATCH', message: 'Se intentó registrar fruto certificado desde una fuente no certificada.', severity: 'CRITICAL' });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const id = uuidv4();
    const sccId = uuidv4();
    await conn.query(
      `INSERT INTO SccTransaction (id,uocId,type,productType,supplyModel,volumeMt,batchRef,counterparty,documentRef,transactionDate,notes,createdBy)
       VALUES (?,?, 'RECEPTION','RFF',?,?,?,?,?,?,?,?)`,
      [sccId, req.uocId, data.supplyModel, net / 1000, data.traceabilityLot, source.name, data.documentRef || data.weighTicket, data.deliveredAt, data.observations || null, req.user!.id]
    );
    await conn.query(
      `INSERT INTO RffDelivery (id,uocId,supplySourceId,farmPlotId,deliveredAt,agriculturalLot,traceabilityLot,vehicle,plate,driverName,weighTicket,grossWeightKg,tareWeightKg,netWeightKg,volumeMt,supplyModel,fruitCondition,eligibleAtDelivery,estimatedProductionMt,accumulatedDeliveredMt,varianceMt,documentRef,observations,evidenceId,status,sccTransactionId,createdBy)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, req.uocId, data.supplySourceId, data.farmPlotId || null, data.deliveredAt, data.agriculturalLot || null, data.traceabilityLot, data.vehicle || null, data.plate, data.driverName || null, data.weighTicket, gross, tare, net, net / 1000, data.supplyModel, data.fruitCondition, eligible, estimated, accumulated, variance, data.documentRef || null, data.observations || null, data.evidenceId || null, alerts.length ? 'REVIEW' : 'ACCEPTED', sccId, req.user!.id]
    );
    for (const alert of alerts) {
      await conn.query('INSERT INTO TraceabilityAlert (id,uocId,deliveryId,alertType,severity,message) VALUES (?,?,?,?,?,?)', [uuidv4(), req.uocId, id, alert.type, alert.severity, alert.message]);
    }
    await conn.commit();
    const [rows] = await db.query('SELECT * FROM RffDelivery WHERE id=?', [id]);
    res.status(201).json({ ...(rows as any[])[0], alerts });
  } catch (error: any) {
    await conn.rollback();
    if (error?.code === 'ER_DUP_ENTRY') return fail(res, 409, 'El tiquete o lote de trazabilidad ya existe en esta UoC.');
    throw error;
  } finally {
    conn.release();
  }
};

export const updateDelivery = async (req: ScopedRequest, res: Response) => {
  const { id } = req.params;
  const [currentRows] = await db.query('SELECT * FROM RffDelivery WHERE id=? AND uocId=?', [id, req.uocId]);
  const current = (currentRows as any[])[0];
  if (!current) return fail(res, 404, 'Entrega no encontrada.');
  const gross = cleanNumber(req.body.grossWeightKg ?? current.grossWeightKg);
  const tare = cleanNumber(req.body.tareWeightKg ?? current.tareWeightKg);
  if (gross <= tare) return fail(res, 400, 'El peso bruto debe ser mayor que la tara.');
  const net = gross - tare;
  await db.query('UPDATE RffDelivery SET grossWeightKg=?,tareWeightKg=?,netWeightKg=?,volumeMt=?,status=?,observations=? WHERE id=? AND uocId=?',
    [gross, tare, net, net / 1000, req.body.status || current.status, req.body.observations ?? current.observations, id, req.uocId]);
  const [rows] = await db.query('SELECT * FROM RffDelivery WHERE id=?', [id]);
  res.json((rows as any[])[0]);
};

export const listTraceabilityAlerts = async (req: ScopedRequest, res: Response) => {
  const [rows] = await db.query('SELECT * FROM TraceabilityAlert WHERE uocId=? ORDER BY createdAt DESC', [req.uocId]);
  res.json(rows);
};

export const listPrismaOperations = async (req: ScopedRequest, res: Response) => {
  const [rows] = await db.query('SELECT * FROM PrismaOperation WHERE uocId=? ORDER BY physicalDate DESC, createdAt DESC', [req.uocId]);
  res.json(rows);
};

export const createPrismaOperation = async (req: ScopedRequest, res: Response) => {
  const { operationType, internalReference, prismaReference, product, supplyModel, volumeMt, physicalDate, deadline, status, counterparty, observations } = req.body;
  if (!operationType || !internalReference || !product || !supplyModel || cleanNumber(volumeMt) <= 0 || !physicalDate) return fail(res, 400, 'Complete los campos obligatorios de la operación.');
  const id = uuidv4();
  await db.query(
    `INSERT INTO PrismaOperation (id,uocId,operationType,internalReference,prismaReference,product,supplyModel,volumeMt,physicalDate,deadline,status,counterparty,observations,responsibleId)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, req.uocId, operationType, internalReference, prismaReference || null, product, supplyModel, volumeMt, physicalDate, deadline || null, status || 'DRAFT', counterparty || null, observations || null, req.user!.id]
  );
  const [rows] = await db.query('SELECT * FROM PrismaOperation WHERE id=?', [id]);
  res.status(201).json((rows as any[])[0]);
};

export const updatePrismaOperation = async (req: ScopedRequest, res: Response) => {
  const { id } = req.params;
  const [rows] = await db.query('SELECT * FROM PrismaOperation WHERE id=? AND uocId=?', [id, req.uocId]);
  const current = (rows as any[])[0];
  if (!current) return fail(res, 404, 'Operación no encontrada.');
  const newVolume = cleanNumber(req.body.volumeMt ?? current.volumeMt);
  await db.query('UPDATE PrismaOperation SET prismaReference=?,volumeMt=?,deadline=?,status=?,counterparty=?,observations=? WHERE id=? AND uocId=?',
    [req.body.prismaReference ?? current.prismaReference, newVolume, req.body.deadline ?? current.deadline, req.body.status ?? current.status, req.body.counterparty ?? current.counterparty, req.body.observations ?? current.observations, id, req.uocId]);
  if (req.body.status && req.body.status !== current.status) {
    const adjustmentType = req.body.status === 'CONFIRMED' ? 'CONFIRMATION' : req.body.status === 'REMOVED' ? 'REMOVE' : 'ADJUSTMENT';
    await db.query('INSERT INTO PrismaAdjustment (id,operationId,adjustmentType,previousVolumeMt,newVolumeMt,reason,createdBy) VALUES (?,?,?,?,?,?,?)',
      [uuidv4(), id, adjustmentType, current.volumeMt, newVolume, req.body.reason || `Cambio de estado: ${current.status} → ${req.body.status}`, req.user!.id]);
  }
  const [updated] = await db.query('SELECT * FROM PrismaOperation WHERE id=?', [id]);
  res.json((updated as any[])[0]);
};
