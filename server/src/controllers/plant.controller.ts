import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';
import { ScopedRequest } from '../middleware/uoc.middleware';

export const getPlantRecords = async (req: ScopedRequest, res: Response) => {
  const section = typeof req.query.section === 'string' ? req.query.section : '';
  let sql = 'SELECT * FROM PlantRecord WHERE uocId=?';
  const params: any[] = [req.uocId];
  if (section) { sql += ' AND section=?'; params.push(section); }
  sql += ' ORDER BY createdAt DESC';
  const [rows] = await pool.query(sql, params);
  res.json(rows);
};

export const createPlantRecord = async (req: ScopedRequest, res: Response) => {
  const { section, title, description, status, responsible, date, meta, result, extra } = req.body;
  if (!section || !title?.trim()) { res.status(400).json({ error: 'Área y título son obligatorios.' }); return; }
  const id = uuidv4();
  await pool.query(
    'INSERT INTO PlantRecord (id,uocId,section,title,description,status,responsible,date,meta,result,extra) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    [id, req.uocId, section, title.trim(), description || null, status || 'PENDING', responsible || null, date || null, meta || null, result || null, JSON.stringify(extra || {})]
  );
  const [rows] = await pool.query('SELECT * FROM PlantRecord WHERE id=? AND uocId=?', [id, req.uocId]);
  res.status(201).json((rows as any[])[0]);
};

export const updatePlantRecord = async (req: ScopedRequest, res: Response) => {
  const allowed = ['title','description','status','responsible','date','meta','result','extra'];
  const entries = allowed.filter(k => req.body[k] !== undefined).map(k => [k, k === 'extra' ? JSON.stringify(req.body[k]) : req.body[k]]);
  if (!entries.length) { res.status(400).json({ error: 'No hay cambios para guardar.' }); return; }
  const [result]: any = await pool.query(`UPDATE PlantRecord SET ${entries.map(([k]) => `${k}=?`).join(',')} WHERE id=? AND uocId=?`, [...entries.map(([,v]) => v), req.params.id, req.uocId]);
  if (!result.affectedRows) { res.status(404).json({ error: 'Registro no encontrado.' }); return; }
  const [rows] = await pool.query('SELECT * FROM PlantRecord WHERE id=? AND uocId=?', [req.params.id, req.uocId]);
  res.json((rows as any[])[0]);
};
