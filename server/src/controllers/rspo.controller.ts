import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import { ScopedRequest } from '../middleware/uoc.middleware';
import { buildAiSoilStudy, parseKmlGeometry } from '../kmlSoilAnalysis';

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
  if (cleanNumber(plantedArea) > cleanNumber(totalArea) || cleanNumber(certifiedArea) > cleanNumber(plantedArea)) return fail(res, 400, 'El área sembrada no puede superar el área total ni el área certificada superar la sembrada.');
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
  const [currentRows] = await db.query('SELECT * FROM SupplySource WHERE id=? AND uocId=?', [id, req.uocId]);
  const current = (currentRows as any[])[0];
  if (!current) return fail(res, 404, 'Registro no encontrado.');
  const nextTotal = cleanNumber(req.body.totalArea ?? current.totalArea);
  const nextPlanted = cleanNumber(req.body.plantedArea ?? current.plantedArea);
  const nextCertified = cleanNumber(req.body.certifiedArea ?? current.certifiedArea);
  if (nextPlanted > nextTotal || nextCertified > nextPlanted) return fail(res, 400, 'Las áreas no cumplen total ≥ sembrada ≥ certificada.');
  const allowed = ['name','identifier','sourceType','totalArea','plantedArea','certifiedArea','polygonReference','polygonStatus','riskLevel','eligibilityStatus','certificationStatus','responsible','lastEvaluation','expiryDate','notes','status'];
  const entries = allowed.filter(key => req.body[key] !== undefined).map(key => [key, req.body[key]]);
  if (!entries.length) return fail(res, 400, 'No hay cambios para guardar.');
  await db.query(`UPDATE SupplySource SET ${entries.map(([key]) => `${key} = ?`).join(', ')} WHERE id = ? AND uocId = ?`, [...entries.map(([, value]) => value), id, req.uocId]);
  await db.query('INSERT INTO SupplySourceHistory (id,supplySourceId,uocId,changedBy,changesJson) VALUES (?,?,?,?,?)',
    [uuidv4(), id, req.uocId, req.user!.id, JSON.stringify(req.body)]);
  const [rows] = await db.query('SELECT * FROM SupplySource WHERE id = ? AND uocId = ?', [id, req.uocId]);
  if (!(rows as any[]).length) return fail(res, 404, 'Registro no encontrado.');
  res.json((rows as any[])[0]);
};

export const listSupplySourceHistory = async (req: ScopedRequest, res: Response) => {
  const [rows] = await db.query('SELECT h.*,u.name changedByName FROM SupplySourceHistory h JOIN User u ON u.id=h.changedBy WHERE h.supplySourceId=? AND h.uocId=? ORDER BY h.createdAt DESC', [req.params.id, req.uocId]);
  res.json(rows);
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
  if (cleanNumber(plantedArea) > cleanNumber(area)) return fail(res, 400, 'El área sembrada no puede superar el área total.');
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

export const updateFarmPlot = async (req: ScopedRequest, res: Response) => {
  const [currentRows] = await db.query('SELECT * FROM FarmPlot WHERE id=? AND uocId=?', [req.params.id, req.uocId]);
  const current = (currentRows as any[])[0];
  if (!current) return fail(res, 404, 'Plantación no encontrada.');
  if (cleanNumber(req.body.plantedArea ?? current.plantedArea) > cleanNumber(req.body.area ?? current.area)) return fail(res, 400, 'El área sembrada no puede superar el área total.');
  const allowed = ['name','farmName','area','plantedArea','estimatedProductionMt','eligibilityStatus','certificationStatus','polygonReference'];
  const entries = allowed.filter(k => req.body[k] !== undefined).map(k => [k, req.body[k]]);
  if (!entries.length) return fail(res, 400, 'No hay cambios para guardar.');
  const [result]: any = await db.query(`UPDATE FarmPlot SET ${entries.map(([k]) => `${k}=?`).join(',')} WHERE id=? AND uocId=?`, [...entries.map(([,v]) => v), req.params.id, req.uocId]);
  if (!result.affectedRows) return fail(res, 404, 'Plantación no encontrada.');
  const [rows] = await db.query('SELECT * FROM FarmPlot WHERE id=? AND uocId=?', [req.params.id, req.uocId]);
  res.json((rows as any[])[0]);
};

const ensureSoilStudyTable = async () => {
  await db.query(`CREATE TABLE IF NOT EXISTS FarmPlotSoilStudy (
    id VARCHAR(36) PRIMARY KEY,
    uocId VARCHAR(36) NOT NULL,
    farmPlotId VARCHAR(36) NOT NULL,
    originalFileName VARCHAR(255) NOT NULL,
    kmlText MEDIUMTEXT NOT NULL,
    geometryJson LONGTEXT NOT NULL,
    fieldContext TEXT NULL,
    studyJson LONGTEXT NOT NULL,
    analysisMode ENUM('AI','LOCAL') NOT NULL DEFAULT 'LOCAL',
    model VARCHAR(100) NULL,
    createdBy VARCHAR(36) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_soil_study_plot (uocId, farmPlotId, createdAt),
    FOREIGN KEY (uocId) REFERENCES CertificationUnit(id) ON DELETE CASCADE,
    FOREIGN KEY (farmPlotId) REFERENCES FarmPlot(id) ON DELETE CASCADE,
    FOREIGN KEY (createdBy) REFERENCES User(id)
  )`);
};

export const listFarmPlotSoilStudies = async (req: ScopedRequest, res: Response) => {
  await ensureSoilStudyTable();
  const [plots] = await db.query('SELECT id FROM FarmPlot WHERE id=? AND uocId=?', [req.params.id, req.uocId]);
  if (!(plots as any[]).length) return fail(res, 404, 'Plantación no encontrada.');
  const [rows] = await db.query(
    `SELECT id,farmPlotId,originalFileName,geometryJson,fieldContext,studyJson,analysisMode,model,createdAt
     FROM FarmPlotSoilStudy WHERE farmPlotId=? AND uocId=? ORDER BY createdAt DESC`,
    [req.params.id, req.uocId]
  );
  res.json((rows as any[]).map(row => ({
    ...row,
    geometry: typeof row.geometryJson === 'string' ? JSON.parse(row.geometryJson) : row.geometryJson,
    study: typeof row.studyJson === 'string' ? JSON.parse(row.studyJson) : row.studyJson,
    geometryJson: undefined,
    studyJson: undefined
  })));
};

export const analyzeFarmPlotKml = async (req: ScopedRequest, res: Response) => {
  if (!req.file) return fail(res, 400, 'Seleccione un archivo KML.');
  if (req.file.size > 5 * 1024 * 1024) return fail(res, 400, 'El archivo KML no puede superar 5 MB.');
  const name = req.file.originalname || '';
  if (!name.toLowerCase().endsWith('.kml')) return fail(res, 400, 'El archivo debe tener extensión .kml.');
  const [plots] = await db.query('SELECT id FROM FarmPlot WHERE id=? AND uocId=?', [req.params.id, req.uocId]);
  if (!(plots as any[]).length) return fail(res, 404, 'Plantación no encontrada.');
  const kmlText = req.file.buffer.toString('utf8');
  let geometry;
  try {
    geometry = parseKmlGeometry(kmlText);
  } catch (error: any) {
    return fail(res, 400, error.message || 'No fue posible interpretar el KML.');
  }
  const fieldContext = String(req.body.fieldContext || '').trim().slice(0, 4000);
  const analysis = await buildAiSoilStudy(geometry, fieldContext);
  await ensureSoilStudyTable();
  const id = uuidv4();
  await db.query(
    `INSERT INTO FarmPlotSoilStudy
      (id,uocId,farmPlotId,originalFileName,kmlText,geometryJson,fieldContext,studyJson,analysisMode,model,createdBy)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [id, req.uocId, req.params.id, name.slice(0, 255), kmlText, JSON.stringify(geometry),
      fieldContext || null, JSON.stringify(analysis.study), analysis.mode, analysis.model, req.user!.id]
  );
  await db.query('UPDATE FarmPlot SET polygonReference=? WHERE id=? AND uocId=?', [`KML:${id}`, req.params.id, req.uocId]);
  res.status(201).json({
    id, farmPlotId: req.params.id, originalFileName: name, geometry, study: analysis.study,
    analysisMode: analysis.mode, model: analysis.model, createdAt: new Date().toISOString()
  });
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

export const updatePlantationActivity = async (req: ScopedRequest, res: Response) => {
  const allowed = ['title','description','status','score','isCritical','responsible','activityDate','dueDate'];
  const entries = allowed.filter(k => req.body[k] !== undefined).map(k => [k, req.body[k]]);
  if (!entries.length) return fail(res, 400, 'No hay cambios para guardar.');
  const [result]: any = await db.query(`UPDATE PlantationActivity SET ${entries.map(([k]) => `${k}=?`).join(',')} WHERE id=? AND uocId=?`, [...entries.map(([,v]) => v), req.params.id, req.uocId]);
  if (!result.affectedRows) return fail(res, 404, 'Actividad no encontrada.');
  const [rows] = await db.query('SELECT * FROM PlantationActivity WHERE id=? AND uocId=?', [req.params.id, req.uocId]);
  res.json((rows as any[])[0]);
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
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [sources] = await conn.query('SELECT * FROM SupplySource WHERE id=? AND uocId=? AND status <> "ARCHIVED" FOR UPDATE', [data.supplySourceId, req.uocId]);
    const source = (sources as any[])[0];
    if (!source) { await conn.rollback(); return fail(res, 400, 'La fuente no pertenece a la UoC o está archivada.'); }
    let plot: any = null;
    if (data.farmPlotId) {
      const [plots] = await conn.query('SELECT * FROM FarmPlot WHERE id=? AND uocId=? AND supplySourceId=? FOR UPDATE', [data.farmPlotId, req.uocId, data.supplySourceId]);
      plot = (plots as any[])[0];
      if (!plot) { await conn.rollback(); return fail(res, 400, 'El predio no pertenece a la fuente y UoC seleccionadas.'); }
    }
    if (data.evidenceId) {
      const [evidence] = await conn.query('SELECT id FROM Evidence WHERE id=? AND uocId=?', [data.evidenceId, req.uocId]);
      if (!(evidence as any[]).length) { await conn.rollback(); return fail(res, 400, 'La evidencia no pertenece a la UoC seleccionada.'); }
    }
    const [sumRows] = await conn.query(
      `SELECT COALESCE(SUM(volumeMt),0) total FROM RffDelivery
       WHERE uocId=? AND supplySourceId=? AND status <> 'REJECTED' ${data.farmPlotId ? 'AND farmPlotId=?' : ''} FOR UPDATE`,
      data.farmPlotId ? [req.uocId, data.supplySourceId, data.farmPlotId] : [req.uocId, data.supplySourceId]
    );
    const accumulated = Number((cleanNumber((sumRows as any[])[0]?.total) + net / 1000).toFixed(3));
    let estimated = cleanNumber(plot?.estimatedProductionMt);
    if (!plot) {
      const [estimateRows] = await conn.query('SELECT COALESCE(SUM(estimatedProductionMt),0) total FROM FarmPlot WHERE uocId=? AND supplySourceId=?', [req.uocId, data.supplySourceId]);
      estimated = cleanNumber((estimateRows as any[])[0]?.total);
    }
    const variance = Number((estimated - accumulated).toFixed(3));
    const eligible = source.eligibilityStatus === 'ELIGIBLE' && (!plot || plot.eligibilityStatus === 'ELIGIBLE');
    const certified = source.certificationStatus === 'CERTIFIED' && (!plot || plot.certificationStatus === 'CERTIFIED');
    const alerts: Array<{ type: string; message: string; severity: string }> = [];
    if (!eligible) alerts.push({ type: 'INELIGIBLE', message: 'La fuente o predio no era elegible en la fecha de entrega.', severity: 'CRITICAL' });
    if (estimated > 0 && accumulated > estimated) alerts.push({ type: 'OVERPRODUCTION', message: 'La entrega acumulada supera la producción estimada configurada.', severity: 'HIGH' });
    if (data.fruitCondition === 'CERTIFIED' && !certified) alerts.push({ type: 'CERTIFICATION_MISMATCH', message: 'Se intentó registrar fruto certificado desde una fuente o predio no certificado.', severity: 'CRITICAL' });
    const id = uuidv4();
    const requestedStatus = data.status === 'REJECTED' ? 'REJECTED' : alerts.length ? 'REVIEW' : 'ACCEPTED';
    let sccId: string | null = null;
    if (requestedStatus === 'ACCEPTED') {
      sccId = uuidv4();
      await conn.query(
        `INSERT INTO SccTransaction (id,uocId,type,productType,supplyModel,volumeMt,batchRef,counterparty,documentRef,transactionDate,notes,createdBy)
         VALUES (?,?, 'RECEPTION','RFF',?,?,?,?,?,?,?,?)`,
        [sccId, req.uocId, data.supplyModel, net / 1000, data.traceabilityLot, source.name, data.documentRef || data.weighTicket, data.deliveredAt, data.observations || null, req.user!.id]
      );
    }
    await conn.query(
      `INSERT INTO RffDelivery (id,uocId,supplySourceId,farmPlotId,deliveredAt,agriculturalLot,traceabilityLot,vehicle,plate,driverName,weighTicket,grossWeightKg,tareWeightKg,netWeightKg,volumeMt,supplyModel,fruitCondition,eligibleAtDelivery,estimatedProductionMt,accumulatedDeliveredMt,varianceMt,documentRef,observations,evidenceId,status,sccTransactionId,createdBy)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, req.uocId, data.supplySourceId, data.farmPlotId || null, data.deliveredAt, data.agriculturalLot || null, data.traceabilityLot, data.vehicle || null, data.plate, data.driverName || null, data.weighTicket, gross, tare, net, net / 1000, data.supplyModel, data.fruitCondition, eligible, estimated, accumulated, variance, data.documentRef || null, data.observations || null, data.evidenceId || null, requestedStatus, sccId, req.user!.id]
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
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [currentRows] = await conn.query('SELECT * FROM RffDelivery WHERE id=? AND uocId=? FOR UPDATE', [id, req.uocId]);
    const current = (currentRows as any[])[0];
    if (!current) { await conn.rollback(); return fail(res, 404, 'Entrega no encontrada.'); }
    const weights = calculateDeliveryWeights(req.body.grossWeightKg ?? current.grossWeightKg, req.body.tareWeightKg ?? current.tareWeightKg);
    const nextStatus = req.body.status ?? current.status;
    if (!['REVIEW','ACCEPTED','REJECTED'].includes(nextStatus)) { await conn.rollback(); return fail(res, 400, 'Estado de entrega inválido.'); }
    let sccId = current.sccTransactionId;
    if (nextStatus === 'ACCEPTED') {
      if (sccId) {
        await conn.query('UPDATE SccTransaction SET volumeMt=?,supplyModel=?,batchRef=?,transactionDate=?,notes=? WHERE id=? AND uocId=?',
          [weights.volumeMt, req.body.supplyModel ?? current.supplyModel, req.body.traceabilityLot ?? current.traceabilityLot, req.body.deliveredAt ?? current.deliveredAt, req.body.observations ?? current.observations, sccId, req.uocId]);
      } else {
        sccId = uuidv4();
        await conn.query(`INSERT INTO SccTransaction (id,uocId,type,productType,supplyModel,volumeMt,batchRef,counterparty,documentRef,transactionDate,notes,createdBy)
          SELECT ?,d.uocId,'RECEPTION','RFF',?,?,?,ss.name,COALESCE(d.documentRef,d.weighTicket),d.deliveredAt,d.observations,?
          FROM RffDelivery d JOIN SupplySource ss ON ss.id=d.supplySourceId WHERE d.id=? AND d.uocId=?`,
          [sccId, req.body.supplyModel ?? current.supplyModel, weights.volumeMt, req.body.traceabilityLot ?? current.traceabilityLot, req.user!.id, id, req.uocId]);
      }
    } else if (sccId) {
      await conn.query('UPDATE SccTransaction SET volumeMt=0, notes=CONCAT(COALESCE(notes,"")," | Entrega fuera de balance: ",?) WHERE id=? AND uocId=?',
        [nextStatus, sccId, req.uocId]);
    }
    const [result]: any = await conn.query(
      `UPDATE RffDelivery SET grossWeightKg=?,tareWeightKg=?,netWeightKg=?,volumeMt=?,supplyModel=?,status=?,observations=?,sccTransactionId=? WHERE id=? AND uocId=?`,
      [weights.grossWeightKg, weights.tareWeightKg, weights.netWeightKg, weights.volumeMt, req.body.supplyModel ?? current.supplyModel, nextStatus, req.body.observations ?? current.observations, sccId, id, req.uocId]
    );
    if (!result.affectedRows) { await conn.rollback(); return fail(res, 404, 'Entrega no encontrada.'); }
    await conn.commit();
    const [rows] = await db.query('SELECT * FROM RffDelivery WHERE id=? AND uocId=?', [id, req.uocId]);
    res.json((rows as any[])[0]);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally { conn.release(); }
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
  if ((req.body.status && req.body.status !== current.status) || newVolume !== cleanNumber(current.volumeMt)) {
    const adjustmentType = req.body.status === 'CONFIRMED' ? 'CONFIRMATION' : req.body.status === 'REMOVED' ? 'REMOVE' : 'ADJUSTMENT';
    await db.query('INSERT INTO PrismaAdjustment (id,operationId,adjustmentType,previousVolumeMt,newVolumeMt,reason,createdBy) VALUES (?,?,?,?,?,?,?)',
      [uuidv4(), id, adjustmentType, current.volumeMt, newVolume, req.body.reason || `Cambio de estado: ${current.status} → ${req.body.status}`, req.user!.id]);
  }
  const [updated] = await db.query('SELECT * FROM PrismaOperation WHERE id=?', [id]);
  res.json((updated as any[])[0]);
};

export const listPrismaAdjustments = async (req: ScopedRequest, res: Response) => {
  const [rows] = await db.query(
    `SELECT a.*,u.name changedByName FROM PrismaAdjustment a
     JOIN PrismaOperation o ON o.id=a.operationId JOIN User u ON u.id=a.createdBy
     WHERE a.operationId=? AND o.uocId=? ORDER BY a.createdAt DESC`, [req.params.id, req.uocId]
  );
  res.json(rows);
};

export const listPrismaAttachments = async (req: ScopedRequest, res: Response) => {
  const [rows] = await db.query(
    `SELECT pa.*,e.originalFileName,e.fileName FROM PrismaAttachment pa
     JOIN PrismaOperation o ON o.id=pa.operationId JOIN Evidence e ON e.id=pa.evidenceId
     WHERE pa.operationId=? AND o.uocId=? AND e.uocId=?`, [req.params.id, req.uocId, req.uocId]
  );
  res.json(rows);
};

export const addPrismaAttachment = async (req: ScopedRequest, res: Response) => {
  const [valid] = await db.query(
    `SELECT o.id FROM PrismaOperation o JOIN Evidence e ON e.id=?
     WHERE o.id=? AND o.uocId=? AND e.uocId=?`, [req.body.evidenceId, req.params.id, req.uocId, req.uocId]
  );
  if (!(valid as any[]).length) return fail(res, 400, 'La operación o evidencia no pertenece a la UoC.');
  const id = uuidv4();
  await db.query('INSERT INTO PrismaAttachment (id,operationId,evidenceId) VALUES (?,?,?)', [id, req.params.id, req.body.evidenceId]);
  res.status(201).json({ id, operationId: req.params.id, evidenceId: req.body.evidenceId });
};
