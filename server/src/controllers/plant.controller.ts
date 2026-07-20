import { Request, Response } from 'express';
import pool from '../db';

export const getPlantRecords = async (req: Request, res: Response) => {
  try {
    const { section } = req.query;
    let sql = 'SELECT * FROM PlantRecord';
    const params: any[] = [];
    if (section) { sql += ' WHERE section = ?'; params.push(section); }
    sql += ' ORDER BY createdAt DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: 'Error fetching plant records' }); }
};
