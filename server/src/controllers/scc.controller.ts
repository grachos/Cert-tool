import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';
import { AuthRequest } from '../middleware/auth.middleware';
import { getAuthorizedUocIds } from '../middleware/uoc.middleware';

export const getUocs = async (req: AuthRequest, res: Response) => {
  try {
    const ids = await getAuthorizedUocIds(req.user!);
    const [rows] = ids === null
      ? await pool.query('SELECT * FROM CertificationUnit ORDER BY createdAt DESC')
      : ids.length
        ? await pool.query('SELECT * FROM CertificationUnit WHERE id IN (?) ORDER BY createdAt DESC', [ids])
        : [[] as any[]];
    res.json(rows);
  } catch (error) {
    console.error('Error getting UoCs:', error);
    res.status(500).json({ error: 'Failed to fetch certification units' });
  }
};

export const createUoc = async (req: Request, res: Response) => {
  const { name, companyName, country, area, managerName, managerEmail, type } = req.body;
  const validTypes = ['MIXED', 'PLANTATION', 'MILL', 'SMALLHOLDERS'];
  if (!name?.trim() || !companyName?.trim()) {
    res.status(400).json({ error: 'El nombre de la UoC y la empresa son obligatorios.' });
    return;
  }
  if (type && !validTypes.includes(type)) {
    res.status(400).json({ error: 'El tipo de UoC no es válido.' });
    return;
  }
  const id = uuidv4();
  try {
    await pool.query(
      `INSERT INTO CertificationUnit
       (id, name, companyName, country, area, managerName, managerEmail, type, appliesAll, applicablePrinciples)
       VALUES (?,?,?,?,?,?,?,?,TRUE,?)`,
      [id, name.trim(), companyName.trim(), country || 'Colombia', Number(area) || 0, managerName || null, managerEmail || null, type || 'MIXED', JSON.stringify(['M1','M2','M3','M4','M5','M6','M7'])]
    );
    const [rows]: any = await pool.query('SELECT * FROM CertificationUnit WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error creating UoC:', error);
    res.status(500).json({ error: 'Failed to create certification unit' });
  }
};

export const getTransactions = async (req: Request, res: Response) => {
  const { uocId, type } = req.query;
  try {
    let sql = 'SELECT * FROM SccTransaction WHERE uocId = ?';
    const params: any[] = [uocId];
    if (type) { sql += ' AND type = ?'; params.push(type); }
    sql += ' ORDER BY transactionDate DESC LIMIT 200';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error) {
    console.error('Error getting SCC transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

export const createTransaction = async (req: Request, res: Response) => {
  const { uocId, type, productType, supplyModel, volumeMt, batchRef, counterparty, documentRef, greenhouseGas, transactionDate, notes } = req.body;
  const id = uuidv4();
  try {
    await pool.query(
      'INSERT INTO SccTransaction (id, uocId, type, productType, supplyModel, volumeMt, batchRef, counterparty, documentRef, greenhouseGas, transactionDate, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [id, uocId, type, productType, supplyModel, volumeMt, batchRef, counterparty, documentRef, greenhouseGas || 0, transactionDate ? new Date(transactionDate) : new Date(), notes]
    );
    const [rows]: any = await pool.query('SELECT * FROM SccTransaction WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error creating SCC transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
};

export const getSccDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const uocId = typeof req.query.uocId === 'string' ? req.query.uocId : '';
    const isAll = req.user?.role === 'ADMIN' && (!uocId || uocId === 'all');
    const where = isAll ? '' : ' WHERE uocId = ?';
    const params = isAll ? [] : [uocId];
    const [uocs] = isAll
      ? await pool.query('SELECT COUNT(*) as count FROM CertificationUnit')
      : await pool.query('SELECT COUNT(*) as count FROM CertificationUnit WHERE id = ?', [uocId]);
    const [volumes]: any = await pool.query(`
      SELECT type, productType, supplyModel, SUM(volumeMt) as totalVolume
      FROM SccTransaction${where} GROUP BY type, productType, supplyModel
    `, params);
    const [stock]: any = await pool.query(`
      SELECT productType, supplyModel,
        COALESCE(SUM(CASE WHEN type IN ('RECEPTION','PRODUCTION') THEN volumeMt ELSE 0 END),0) -
        COALESCE(SUM(CASE WHEN type IN ('SALE','TRANSFER') THEN volumeMt ELSE 0 END),0) as balance
      FROM SccTransaction${where} GROUP BY productType, supplyModel
    `, params);
    res.json({ uocCount: (uocs as any[])[0]?.count || 0, volumes, stock });
  } catch (error) {
    console.error('Error getting SCC dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch SCC dashboard' });
  }
};
