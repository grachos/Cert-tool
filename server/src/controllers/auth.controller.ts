import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import { isCentralRole } from '../middleware/plantation.middleware';

async function userPayload(user: any) {
  const [accessRows] = await db.query(
    `SELECT upa.uocId,upa.farmPlotId,upa.accessLevel,
            fp.farmName,fp.name plantationName
     FROM UserPlantationAccess upa
     JOIN FarmPlot fp ON fp.id=upa.farmPlotId
     WHERE upa.userId=? AND upa.status='ACTIVE'
     ORDER BY fp.farmName,fp.name`,
    [user.id]
  );
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isCentralUser: isCentralRole(user.role),
    plantationAccess: accessRows
  };
}

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, role } = req.body;

    // Check if user exists
    const [existingRows] = await db.query('SELECT * FROM User WHERE email = ?', [email]);
    if ((existingRows as any[]).length > 0) {
      res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userId = uuidv4();
    const userRole = role || 'USER';

    // Create user
    await db.query(
      'INSERT INTO User (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)',
      [userId, email, hashedPassword, name, userRole]
    );

    res.status(201).json({ message: 'Usuario registrado exitosamente', userId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor al registrar usuario.' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user
    const [rows] = await db.query('SELECT * FROM User WHERE email = ?', [email]);
    const user = (rows as any[])[0];
    if (!user) {
      res.status(400).json({ error: 'Credenciales inválidas.' });
      return;
    }

    // Validate password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      res.status(400).json({ error: 'Credenciales inválidas.' });
      return;
    }

    // Generate token
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      res.status(500).json({ error: 'Configuración de autenticación incompleta.' });
      return;
    }
    const token = jwt.sign(
      { id: user.id, role: user.role },
      secret,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      token,
      user: await userPayload(user)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor al iniciar sesión.' });
  }
};

export const getProfile = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const [rows] = await db.query(
      'SELECT id, name, email, role, createdAt FROM User WHERE id = ?',
      [userId]
    );
    const user = (rows as any[])[0];
    
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }
    
    res.status(200).json({
      ...await userPayload(user),
      createdAt: user.createdAt
    });
  } catch {
    res.status(500).json({ error: 'Error al obtener perfil.' });
  }
};
