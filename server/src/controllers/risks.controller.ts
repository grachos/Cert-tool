import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import { PlantationScopedRequest, canAccessFarmPlot, restrictedFarmPlotSql } from '../middleware/plantation.middleware';

export const getRisks = async (req: PlantationScopedRequest, res: Response): Promise<void> => {
  try {
    const { standardId } = req.query;
    let query = 'SELECT * FROM Risk WHERE uocId=?';
    let params: any[] = [(req as any).uocId];
    const access = restrictedFarmPlotSql(req, 'farmPlotId');
    query += access.clause;
    params.push(...access.params);
    
    if (standardId) {
      query += ' AND standardId = ?';
      params.push(standardId);
    }
    
    const [rows] = await db.query(query, params);
    const risks = rows as any[];
    
    const formattedRisks = await Promise.all(risks.map(async (risk) => {
      const [stdRows] = await db.query('SELECT * FROM Standard WHERE id = ?', [risk.standardId]);
      return {
        ...risk,
        standard: (stdRows as any[])[0] || null
      };
    }));
    
    res.status(200).json(formattedRisks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener riesgos.' });
  }
};

export const createRisk = async (req: PlantationScopedRequest, res: Response): Promise<void> => {
  try {
    const data = req.body;
    const authReq = req as any;
    let farmPlotId = String(data.farmPlotId || '').trim() || null;
    if (req.plantationScope?.restricted && !farmPlotId && req.plantationScope.farmPlotIds.length === 1) {
      farmPlotId = req.plantationScope.farmPlotIds[0];
    }
    if (req.plantationScope?.restricted && (!farmPlotId || !canAccessFarmPlot(req, farmPlotId))) {
      res.status(403).json({ error: 'El riesgo debe pertenecer a una plantación asignada.' });
      return;
    }
    
    // Calculate level based on probability * impact
    const score = data.probability * data.impact;
    let level = 'LOW';
    if (score >= 15) level = 'CRITICAL';
    else if (score >= 10) level = 'HIGH';
    else if (score >= 5) level = 'MEDIUM';

    const riskId = uuidv4();
    const ownerName = authReq.user?.name || data.owner || 'Anonimo';
    
    await db.query(
      `INSERT INTO Risk (id,title,description,category,standardId,probability,impact,level,status,owner,uocId,farmPlotId)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [riskId, data.title, data.description, data.category, data.standardId, data.probability, data.impact, level, data.status || 'OPEN', ownerName, authReq.uocId, farmPlotId]
    );
    
    const [riskRows] = await db.query('SELECT * FROM Risk WHERE id = ? AND uocId=?', [riskId, authReq.uocId]);
    const newRisk = (riskRows as any[])[0];
    
    res.status(201).json(newRisk);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear riesgo.' });
  }
};
