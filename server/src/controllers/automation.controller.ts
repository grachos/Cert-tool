import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import cache from '../cache';

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
      dueDate: new Date(p.dueDate).toISOString().split('T')[0],
      createdDate: p.createdDate,
      progress: p.progress,
      standard: p.standardId, // frontend expects standard
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

    cache.del('dashboard_stats');

    res.status(201).json({
      id: newPlan.id,
      title: newPlan.title,
      description: newPlan.description,
      type: newPlan.type,
      status: newPlan.status,
      priority: newPlan.priority,
      assigneeId: newPlan.assigneeId,
      dueDate: new Date(newPlan.dueDate).toISOString().split('T')[0],
      createdDate: newPlan.createdDate,
      progress: newPlan.progress,
      standard: newPlan.standardId,
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

export const updateActionPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, type, status, priority, assigneeId, dueDate, progress } = req.body;

    // Get current plan to handle optional fields
    const [currentRows] = await db.query('SELECT * FROM ActionPlan WHERE id = ?', [id]);
    const current = (currentRows as any[])[0];

    if (!current) {
      res.status(404).json({ error: 'Plan de acción no encontrado.' });
      return;
    }

    const updatedTitle = title !== undefined ? title : current.title;
    const updatedDescription = description !== undefined ? description : current.description;
    const updatedType = type !== undefined ? type : current.type;
    const updatedStatus = status !== undefined ? status : current.status;
    const updatedPriority = priority !== undefined ? priority : current.priority;
    const updatedAssigneeId = assigneeId !== undefined ? assigneeId : current.assigneeId;
    const updatedDueDate = dueDate !== undefined ? new Date(dueDate) : new Date(current.dueDate);
    const updatedProgress = progress !== undefined ? progress : current.progress;

    await db.query(
      `UPDATE ActionPlan 
       SET title = ?, description = ?, type = ?, status = ?, priority = ?, assigneeId = ?, dueDate = ?, progress = ? 
       WHERE id = ?`,
      [updatedTitle, updatedDescription, updatedType, updatedStatus, updatedPriority, updatedAssigneeId, updatedDueDate, updatedProgress, id]
    );

    // Fetch updated plan with assignee
    const [rows] = await db.query(
      `SELECT p.*, u.name AS assigneeName, u.email AS assigneeEmail
       FROM ActionPlan p
       JOIN User u ON p.assigneeId = u.id
       WHERE p.id = ?`,
      [id]
    );
    const updated = (rows as any[])[0];

    cache.del('dashboard_stats');

    res.status(200).json({
      id: updated.id,
      title: updated.title,
      description: updated.description,
      type: updated.type,
      status: updated.status,
      priority: updated.priority,
      assigneeId: updated.assigneeId,
      dueDate: new Date(updated.dueDate).toISOString().split('T')[0],
      createdDate: updated.createdDate,
      progress: updated.progress,
      standard: updated.standardId,
      assignee: {
        name: updated.assigneeName,
        email: updated.assigneeEmail
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar plan de acción.' });
  }
};
