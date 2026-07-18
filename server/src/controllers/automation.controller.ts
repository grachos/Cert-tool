import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';

export const getActionPlans = async (req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, u.name AS assigneeName, u.email AS assigneeEmail
       FROM ActionPlan p
       JOIN User u ON p.assigneeId = u.id
       ORDER BY p.dueDate ASC`
    );
    const plans = rows as any[];
    
    // Format to match old structure: { ..., assignee: { name, email } }
    const formattedPlans = plans.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      type: p.type,
      status: p.status,
      priority: p.priority,
      assigneeId: p.assigneeId,
      dueDate: p.dueDate,
      createdDate: p.createdDate,
      progress: p.progress,
      assignee: {
        name: p.assigneeName,
        email: p.assigneeEmail
      }
    }));
    
    res.status(200).json(formattedPlans);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener planes de acción.' });
  }
};

export const createActionPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body;
    const planId = uuidv4();
    const dueDate = new Date(data.dueDate);
    const progress = data.progress || 0;
    
    await db.query(
      `INSERT INTO ActionPlan (id, title, description, type, status, priority, assigneeId, dueDate, progress)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [planId, data.title, data.description, data.type, data.status || 'PENDING', data.priority, data.assigneeId, dueDate, progress]
    );

    // Fetch new plan with assignee
    const [rows] = await db.query(
      `SELECT p.*, u.name AS assigneeName, u.email AS assigneeEmail
       FROM ActionPlan p
       JOIN User u ON p.assigneeId = u.id
       WHERE p.id = ?`,
      [planId]
    );
    const newPlan = (rows as any[])[0];

    if (!newPlan) {
      res.status(500).json({ error: 'Error al recuperar el plan creado.' });
      return;
    }

    res.status(201).json({
      id: newPlan.id,
      title: newPlan.title,
      description: newPlan.description,
      type: newPlan.type,
      status: newPlan.status,
      priority: newPlan.priority,
      assigneeId: newPlan.assigneeId,
      dueDate: newPlan.dueDate,
      createdDate: newPlan.createdDate,
      progress: newPlan.progress,
      assignee: {
        name: newPlan.assigneeName,
        email: newPlan.assigneeEmail
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear plan de acción.' });
  }
};
