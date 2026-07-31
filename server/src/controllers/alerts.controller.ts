import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';
import { ScopedRequest } from '../middleware/uoc.middleware';

const ensureAlertTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS Alert (
      id VARCHAR(36) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(50) NOT NULL DEFAULT 'info',
      priority VARCHAR(50) NOT NULL DEFAULT 'media',
      action VARCHAR(255) NULL,
      module VARCHAR(100) NULL,
      uocId VARCHAR(36) NULL,
      dismissed TINYINT(1) NOT NULL DEFAULT 0,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_alert_dismissed_created (dismissed, createdAt),
      INDEX idx_alert_uoc_dismissed (uocId, dismissed, createdAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

export const getAlerts = async (req: ScopedRequest, res: Response) => {
  try {
    await ensureAlertTable();
    const [rows] = req.uocId
      ? await pool.query('SELECT * FROM Alert WHERE uocId=? AND dismissed=0 ORDER BY createdAt DESC LIMIT 50', [req.uocId])
      : await pool.query('SELECT * FROM Alert WHERE dismissed=0 ORDER BY createdAt DESC LIMIT 50');
    res.json(rows);
  } catch (error) {
    console.error('Error getting alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
};

export const createAlert = async (req: ScopedRequest, res: Response) => {
  const { title, message, type, priority, action, module } = req.body;
  const id = uuidv4();
  try {
    await ensureAlertTable();
    await pool.query(
      'INSERT INTO Alert (id, title, message, type, priority, action, module, uocId) VALUES (?,?,?,?,?,?,?,?)',
      [id, title, message, type || 'info', priority || 'media', action, module, req.uocId]
    );
    const [rows]: any = await pool.query('SELECT * FROM Alert WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({ error: 'Failed to create alert' });
  }
};

export const dismissAlert = async (req: ScopedRequest, res: Response) => {
  const { id } = req.params;
  try {
    await ensureAlertTable();
    await pool.query('UPDATE Alert SET dismissed=1 WHERE id=? AND uocId=?', [id, req.uocId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error dismissing alert:', error);
    res.status(500).json({ error: 'Failed to dismiss alert' });
  }
};
