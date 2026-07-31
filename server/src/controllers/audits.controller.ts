import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';

// Get all audits
export const getAudits = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Audit WHERE uocId=? ORDER BY createdAt DESC', [(req as any).uocId]);
    res.json(rows);
  } catch (error) {
    console.error('Error in getAudits:', error);
    res.status(500).json({ error: 'Failed to fetch audits' });
  }
};

// Get all requirements for dropdown
export const getAllRequirements = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(
      "SELECT id,clause,title,standardId FROM Requirement WHERE standardId IN ('RSPO','SCC') ORDER BY standardId,clause"
    );
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
      'INSERT INTO Audit (id, title, date, type, auditorName, status,uocId) VALUES (?, ?, ?, ?, ?, ?,?)',
      [id, title, new Date(date), type, auditorName, 'SCHEDULED', (req as any).uocId]
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
      WHERE nc.auditId = ? AND nc.uocId=?
      ORDER BY nc.createdAt DESC
    `, [id, (req as any).uocId]);
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
      'INSERT INTO NonConformance (id, auditId, requirementId, type, description, status,uocId) SELECT ?,?,?,?,?,?,? FROM Audit WHERE id=? AND uocId=?',
      [id, auditId, requirementId, type, description, 'OPEN', (req as any).uocId, auditId, (req as any).uocId]
    );
    const [rows]: any = await pool.query('SELECT * FROM NonConformance WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error in createFinding:', error);
    res.status(500).json({ error: 'Failed to create finding' });
  }
};

// Validación determinística del cierre: no simula una evaluación de IA.
export const verifyFindingClosure = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const [ncRows] = await pool.query('SELECT * FROM NonConformance WHERE id = ? AND uocId=?', [id, (req as any).uocId]);
    const findings = ncRows as any[];

    if (findings.length === 0) {
      res.status(404).json({ error: 'Finding not found' });
      return;
    }

    const finding = findings[0];

    const [planRows] = await pool.query('SELECT status, progress FROM ActionPlan WHERE nonConformanceId = ? AND uocId=?', [id, (req as any).uocId]);
    const plans = planRows as any[];

    let isApproved = false;
    let aiJustification = '';

    if (plans.length === 0) {
      isApproved = false;
      aiJustification = `El cierre no procede: la No Conformidad (${finding.type}) no tiene un Plan de Acción asociado. Registre el plan correctivo y complete su ejecución.`;
    } else {
      const allCompleted = plans.every(p => p.status === 'COMPLETED' || p.progress === 100);
      
      if (allCompleted) {
        isApproved = true;
        aiJustification = `Cierre validado mediante reglas de control: ${plans.length} plan(es) de acción asociado(s) están completados al 100%.`;
        
        await pool.query('UPDATE NonConformance SET status = ? WHERE id = ? AND uocId=?', ['CLOSED', id, (req as any).uocId]);
      } else {
        isApproved = false;
        const pendingPlans = plans.filter(p => p.status !== 'COMPLETED' && p.progress < 100).length;
        aiJustification = `El cierre no procede: existen ${pendingPlans} plan(es) de acción asociado(s) que aún no están al 100% de progreso.`;
      }
    }

    res.json({ isApproved, justification: aiJustification, aiJustification });
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
      WHERE n.uocId=?
      ORDER BY n.createdAt DESC
    `, [(req as any).uocId]);
    res.json(rows);
  } catch (error) {
    console.error('Error in getAllFindings:', error);
    res.status(500).json({ error: 'Failed to fetch all findings' });
  }
};
