import { NextFunction, Request, Response } from 'express';
import db from '../db';

export interface ScopedRequest extends Request {
  user?: { id: string; role: string };
  uocId?: string;
}

export async function canAccessUoc(user: { id: string; role: string }, uocId: string): Promise<boolean> {
  if (['SUPERADMIN', 'ADMIN'].includes(user.role)) return true;
  const [rows] = await db.query(
    'SELECT 1 FROM UserCertificationUnit WHERE userId = ? AND uocId = ? LIMIT 1',
    [user.id, uocId]
  );
  return (rows as any[]).length > 0;
}

export const requireUocAccess = (options: { allowAllForAdmin?: boolean } = {}) => {
  return async (req: ScopedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'No autenticado.' });
        return;
      }
      const raw = req.params.uocId || req.body?.uocId || req.query?.uocId;
      const uocId = typeof raw === 'string' ? raw.trim() : '';
      if (!uocId || uocId === 'all') {
        if (['SUPERADMIN', 'ADMIN'].includes(req.user.role) && options.allowAllForAdmin) {
          next();
          return;
        }
        res.status(400).json({ error: 'Debe seleccionar una unidad de certificación.' });
        return;
      }
      if (!(await canAccessUoc(req.user, uocId))) {
        res.status(403).json({ error: 'No tiene acceso a la unidad de certificación solicitada.' });
        return;
      }
      req.uocId = uocId;
      next();
    } catch {
      res.status(500).json({ error: 'No fue posible validar el acceso a la unidad de certificación.' });
    }
  };
};

export async function getAuthorizedUocIds(user: { id: string; role: string }): Promise<string[] | null> {
  if (['SUPERADMIN', 'ADMIN'].includes(user.role)) return null;
  const [rows] = await db.query('SELECT uocId FROM UserCertificationUnit WHERE userId = ?', [user.id]);
  return (rows as any[]).map(row => row.uocId);
}
