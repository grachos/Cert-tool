import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.email, u.name, u.role, u.createdAt,
       COALESCE(JSON_ARRAYAGG(CASE WHEN cu.id IS NULL THEN NULL ELSE JSON_OBJECT('id',cu.id,'name',cu.name) END), JSON_ARRAY()) AS assignedUocs
       FROM User u
       LEFT JOIN UserCertificationUnit ucu ON ucu.userId=u.id
       LEFT JOIN CertificationUnit cu ON cu.id=ucu.uocId
       GROUP BY u.id ORDER BY u.createdAt DESC`
    );
    res.status(200).json(rows);
  } catch (error) { console.error(error); res.status(500).json({ error: 'Error al obtener usuarios.' }); }
};

export const getUserUocs = async (req: Request, res: Response): Promise<void> => {
  const [rows] = await db.query(
    `SELECT cu.* FROM CertificationUnit cu
     JOIN UserCertificationUnit ucu ON ucu.uocId=cu.id
     WHERE ucu.userId=? ORDER BY cu.name`, [req.params.id]
  );
  res.json(rows);
};

export const assignUserUoc = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  const userId = String(req.params.id);
  const uocId = String(req.body.uocId || '');
  if (!uocId) { res.status(400).json({ error: 'La UoC es obligatoria.' }); return; }
  if (authReq.user?.id === userId) { res.status(400).json({ error: 'No puede modificar su propia asignación.' }); return; }
  const [targets] = await db.query('SELECT id, role FROM User WHERE id=?', [userId]);
  const [uocs] = await db.query('SELECT id FROM CertificationUnit WHERE id=?', [uocId]);
  if (!(targets as any[]).length || !(uocs as any[]).length) { res.status(404).json({ error: 'Usuario o UoC no encontrado.' }); return; }
  await db.query('INSERT IGNORE INTO UserCertificationUnit (userId,uocId) VALUES (?,?)', [userId, uocId]);
  res.status(201).json({ userId, uocId });
};

export const removeUserUoc = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  const userId = String(req.params.id);
  const uocId = String(req.params.uocId);
  if (authReq.user?.id === userId) { res.status(400).json({ error: 'No puede modificar su propia asignación.' }); return; }
  const [result]: any = await db.query('DELETE FROM UserCertificationUnit WHERE userId=? AND uocId=?', [userId, uocId]);
  if (!result.affectedRows) { res.status(404).json({ error: 'Asignación no encontrada.' }); return; }
  res.json({ message: 'Asignación retirada.' });
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, role } = req.body;
    const [existingRows] = await db.query('SELECT * FROM User WHERE email = ?', [email]);
    if ((existingRows as any[]).length > 0) { res.status(400).json({ error: 'El correo ya está registrado.' }); return; }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const userId = uuidv4();
    await db.query('INSERT INTO User (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)', [userId, email, hashedPassword, name, role]);
    const [userRows] = await db.query('SELECT id, email, name, role, createdAt FROM User WHERE id = ?', [userId]);
    res.status(201).json((userRows as any[])[0]);
  } catch (error) { console.error(error); res.status(500).json({ error: 'Error al crear usuario.' }); }
};

export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    await db.query('UPDATE User SET role = ? WHERE id = ?', [role, id]);
    const [userRows] = await db.query('SELECT id, email, name, role FROM User WHERE id = ?', [id]);
    res.status(200).json((userRows as any[])[0]);
  } catch (error) { console.error(error); res.status(500).json({ error: 'Error al actualizar rol.' }); }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, role, password } = req.body;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      await db.query('UPDATE User SET name = ?, email = ?, role = ?, password = ? WHERE id = ?', [name, email, role, hashedPassword, id]);
    } else {
      await db.query('UPDATE User SET name = ?, email = ?, role = ? WHERE id = ?', [name, email, role, id]);
    }
    const [userRows] = await db.query('SELECT id, email, name, role, createdAt FROM User WHERE id = ?', [id]);
    res.status(200).json((userRows as any[])[0]);
  } catch (error) { console.error(error); res.status(500).json({ error: 'Error al actualizar usuario.' }); }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const authReq = req as any;
    if (authReq.user?.id === id) { res.status(400).json({ error: 'No puedes eliminar tu propia cuenta.' }); return; }
    await db.query('DELETE FROM User WHERE id = ?', [id]);
    res.status(200).json({ message: 'Usuario eliminado.' });
  } catch (error) { console.error(error); res.status(500).json({ error: 'Error al eliminar usuario.' }); }
};
