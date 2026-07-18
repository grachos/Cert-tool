import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';

export const getRisks = async (req: Request, res: Response): Promise<void> => {
  try {
    const { standardId } = req.query;
    let query = 'SELECT * FROM Risk';
    let params: any[] = [];
    
    if (standardId) {
      query = 'SELECT * FROM Risk WHERE standardId = ?';
      params = [standardId];
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

export const createRisk = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body;
    const authReq = req as any;
    
    // Calculate level based on probability * impact
    const score = data.probability * data.impact;
    let level = 'LOW';
    if (score >= 15) level = 'CRITICAL';
    else if (score >= 10) level = 'HIGH';
    else if (score >= 5) level = 'MEDIUM';

    const riskId = uuidv4();
    const ownerName = authReq.user?.name || data.owner || 'Anonimo';
    
    await db.query(
      `INSERT INTO Risk (id, title, description, category, standardId, probability, impact, level, status, owner)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [riskId, data.title, data.description, data.category, data.standardId, data.probability, data.impact, level, data.status || 'OPEN', ownerName]
    );
    
    const [riskRows] = await db.query('SELECT * FROM Risk WHERE id = ?', [riskId]);
    const newRisk = (riskRows as any[])[0];
    
    res.status(201).json(newRisk);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear riesgo.' });
  }
};
