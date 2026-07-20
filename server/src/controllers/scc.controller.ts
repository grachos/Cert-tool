import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';

export const getUocs = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query('SELECT * FROM CertificationUnit ORDER BY createdAt DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error getting UoCs:', error);
    res.status(500).json({ error: 'Failed to fetch certification units' });
  }
};

export const createUoc = async (req: Request, res: Response) => {
  const { name, companyName, country, area, managerName, managerEmail } = req.body;
  const id = uuidv4();
  try {
    await pool.query(
      'INSERT INTO CertificationUnit (id, name, companyName, country, area, managerName, managerEmail) VALUES (?,?,?,?,?,?,?)',
      [id, name, companyName, country || 'Colombia', area || 0, managerName, managerEmail]
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
    let sql = 'SELECT * FROM SccTransaction WHERE 1=1';
    const params: any[] = [];
    if (uocId) { sql += ' AND uocId = ?'; params.push(uocId); }
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

export const getSccDashboard = async (req: Request, res: Response) => {
  try {
    const [uocs] = await pool.query('SELECT COUNT(*) as count FROM CertificationUnit');
    const [volumes]: any = await pool.query(`
      SELECT type, productType, supplyModel, SUM(volumeMt) as totalVolume
      FROM SccTransaction GROUP BY type, productType, supplyModel
    `);
    const [stock]: any = await pool.query(`
      SELECT productType, supplyModel,
        COALESCE(SUM(CASE WHEN type IN ('RECEPTION','PRODUCTION') THEN volumeMt ELSE 0 END),0) -
        COALESCE(SUM(CASE WHEN type IN ('SALE','TRANSFER') THEN volumeMt ELSE 0 END),0) as balance
      FROM SccTransaction GROUP BY productType, supplyModel
    `);
    res.json({ uocCount: (uocs as any[])[0]?.count || 0, volumes, stock });
  } catch (error) {
    console.error('Error getting SCC dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch SCC dashboard' });
  }
};
