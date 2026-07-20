import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';

export const getStakeholders = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Stakeholder ORDER BY name ASC');
    res.json(rows);
  } catch (error) {
    console.error('Error getting stakeholders:', error);
    res.status(500).json({ error: 'Failed to fetch stakeholders' });
  }
};

export const createStakeholder = async (req: Request, res: Response) => {
  const { name, type, location, interest, influence, engagementChannel, lastEngagement, responsibleName, responsibleEmail, notes } = req.body;
  const id = uuidv4();
  try {
    await pool.query(
      'INSERT INTO Stakeholder (id, name, type, location, interest, influence, engagementChannel, lastEngagement, responsibleName, responsibleEmail, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [id, name, type, location, interest, influence || 'MEDIUM', engagementChannel, lastEngagement, responsibleName, responsibleEmail, notes]
    );
    const [rows]: any = await pool.query('SELECT * FROM Stakeholder WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error creating stakeholder:', error);
    res.status(500).json({ error: 'Failed to create stakeholder' });
  }
};

export const updateStakeholder = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, type, location, interest, influence, engagementChannel, lastEngagement, nextEngagement, responsibleName, responsibleEmail, status, notes } = req.body;
  try {
    await pool.query(
      'UPDATE Stakeholder SET name=?, type=?, location=?, interest=?, influence=?, engagementChannel=?, lastEngagement=?, nextEngagement=?, responsibleName=?, responsibleEmail=?, status=?, notes=? WHERE id=?',
      [name, type, location, interest, influence, engagementChannel, lastEngagement, nextEngagement, responsibleName, responsibleEmail, status, notes, id]
    );
    const [rows]: any = await pool.query('SELECT * FROM Stakeholder WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (error) {
    console.error('Error updating stakeholder:', error);
    res.status(500).json({ error: 'Failed to update stakeholder' });
  }
};

export const deleteStakeholder = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM Stakeholder WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting stakeholder:', error);
    res.status(500).json({ error: 'Failed to delete stakeholder' });
  }
};
