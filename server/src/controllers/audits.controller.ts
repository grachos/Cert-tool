import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';

// Get all audits
export const getAudits = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Audit ORDER BY createdAt DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error in getAudits:', error);
    res.status(500).json({ error: 'Failed to fetch audits' });
  }
};

// Get all requirements for dropdown
export const getAllRequirements = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query('SELECT id, clause, title, standardId FROM Requirement ORDER BY standardId, clause');
    res.json(rows);
  } catch (error) {
    console.error('Error in getAllRequirements:', error);
    res.status(500).json({ error: 'Failed to fetch requirements' });
  }
};

// Create an audit
export const createAudit = async (req: Request, res: Response) => {
  const { title, date, type, auditorName } = req.body;
  const id = uuidv4();
  try {
    await pool.query(
      'INSERT INTO Audit (id, title, date, type, auditorName, status) VALUES (?, ?, ?, ?, ?, ?)',
      [id, title, new Date(date), type, auditorName, 'SCHEDULED']
    );
    const [rows]: any = await pool.query('SELECT * FROM Audit WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error in createAudit:', error);
    res.status(500).json({ error: 'Failed to create audit' });
  }
};

// Get findings for an audit
export const getAuditFindings = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(`
      SELECT nc.*, r.clause, r.title as requirementTitle, r.standardId 
      FROM NonConformance nc
      JOIN Requirement r ON nc.requirementId = r.id
      WHERE nc.auditId = ?
      ORDER BY nc.createdAt DESC
    `, [id]);
    res.json(rows);
  } catch (error) {
    console.error('Error in getAuditFindings:', error);
    res.status(500).json({ error: 'Failed to fetch findings' });
  }
};

// Create a finding
export const createFinding = async (req: Request, res: Response) => {
  const { id: auditId } = req.params;
  const { requirementId, type, description } = req.body;
  const id = uuidv4();
  try {
    await pool.query(
      'INSERT INTO NonConformance (id, auditId, requirementId, type, description, status) VALUES (?, ?, ?, ?, ?, ?)',
      [id, auditId, requirementId, type, description, 'OPEN']
    );
    const [rows]: any = await pool.query('SELECT * FROM NonConformance WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error in createFinding:', error);
    res.status(500).json({ error: 'Failed to create finding' });
  }
};

// AI Verification Mock for Closing a Finding
export const verifyFindingClosure = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const [ncRows] = await pool.query('SELECT * FROM NonConformance WHERE id = ?', [id]);
    const findings = ncRows as any[];

    if (findings.length === 0) {
      res.status(404).json({ error: 'Finding not found' });
      return;
    }

    const finding = findings[0];

    const [planRows] = await pool.query('SELECT status, progress FROM ActionPlan WHERE nonConformanceId = ?', [id]);
    const plans = planRows as any[];

    let isApproved = false;
    let aiJustification = '';

    if (plans.length === 0) {
      isApproved = false;
      aiJustification = `La IA determinó que no se puede cerrar la No Conformidad (${finding.type}) porque no existe ningún Plan de Acción asociado para abordarla. Por favor, crea un plan de acción correctivo y complétalo.`;
    } else {
      const allCompleted = plans.every(p => p.status === 'COMPLETED' || p.progress === 100);
      
      if (allCompleted) {
        isApproved = true;
        aiJustification = `La IA ha validado exitosamente el cierre de la No Conformidad. Se encontró evidencia de ${plans.length} plan(es) de acción asociado(s) completado(s) al 100%, cumpliendo con la resolución del hallazgo.`;
        
        await pool.query('UPDATE NonConformance SET status = ? WHERE id = ?', ['CLOSED', id]);
      } else {
        isApproved = false;
        const pendingPlans = plans.filter(p => p.status !== 'COMPLETED' && p.progress < 100).length;
        aiJustification = `La IA rechaza el cierre de esta No Conformidad. Existen ${pendingPlans} plan(es) de acción asociado(s) que aún no están al 100% de progreso.`;
      }
    }

    res.json({ isApproved, aiJustification });
  } catch (error) {
    console.error('Error in verifyFindingClosure:', error);
    res.status(500).json({ error: 'Failed to verify finding closure' });
  }
};

// Get all findings (across all audits)
export const getAllFindings = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(`
      SELECT n.*, r.title as requirementTitle, r.clause, a.title as auditTitle 
      FROM NonConformance n 
      LEFT JOIN Requirement r ON n.requirementId = r.id
      LEFT JOIN Audit a ON n.auditId = a.id
      ORDER BY n.createdAt DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error in getAllFindings:', error);
    res.status(500).json({ error: 'Failed to fetch all findings' });
  }
};
