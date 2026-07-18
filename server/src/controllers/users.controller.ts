import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await db.query(
      'SELECT id, email, name, role, createdAt FROM User ORDER BY createdAt DESC'
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener usuarios.' });
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, role } = req.body;

    const [existingRows] = await db.query('SELECT * FROM User WHERE email = ?', [email]);
    if ((existingRows as any[]).length > 0) {
      res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const userId = uuidv4();

    await db.query(
      'INSERT INTO User (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)',
      [userId, email, hashedPassword, name, role]
    );

    const [userRows] = await db.query(
      'SELECT id, email, name, role, createdAt FROM User WHERE id = ?',
      [userId]
    );
    const newUser = (userRows as any[])[0];

    res.status(201).json(newUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear usuario.' });
  }
};

export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    await db.query('UPDATE User SET role = ? WHERE id = ?', [role, id]);

    const [userRows] = await db.query(
      'SELECT id, email, name, role FROM User WHERE id = ?',
      [id]
    );
    const updatedUser = (userRows as any[])[0];

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar rol del usuario.' });
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const authReq = req as any;

    // Evitar que el administrador se elimine a sí mismo
    if (authReq.user?.id === id) {
      res.status(400).json({ error: 'No puedes eliminar tu propia cuenta.' });
      return;
    }

    await db.query('DELETE FROM User WHERE id = ?', [id]);

    res.status(200).json({ message: 'Usuario eliminado correctamente.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar usuario.' });
  }
};
