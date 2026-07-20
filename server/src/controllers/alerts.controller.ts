import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';

export const getAlerts = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Alert WHERE dismissed = 0 ORDER BY createdAt DESC LIMIT 50');
    res.json(rows);
  } catch (error) {
    console.error('Error getting alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
};

export const createAlert = async (req: Request, res: Response) => {
  const { title, message, type, priority, action, module } = req.body;
  const id = uuidv4();
  try {
    await pool.query(
      'INSERT INTO Alert (id, title, message, type, priority, action, module) VALUES (?,?,?,?,?,?,?)',
      [id, title, message, type || 'info', priority || 'media', action, module]
    );
    const [rows]: any = await pool.query('SELECT * FROM Alert WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({ error: 'Failed to create alert' });
  }
};

export const dismissAlert = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE Alert SET dismissed = 1 WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error dismissing alert:', error);
    res.status(500).json({ error: 'Failed to dismiss alert' });
  }
};
