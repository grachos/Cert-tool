import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import pool from '../db';
import cache from '../cache';

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 5;

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendTokenEmail(email: string, otp: string, documentName: string, action: string): Promise<void> {
  console.log(`\n========================================`);
  console.log(`  TOKEN DE APROBACIÓN GENERADO`);
  console.log(`  Para: ${email}`);
  console.log(`  Documento: ${documentName}`);
  console.log(`  Acción: ${action}`);
  console.log(`  Token: ${otp}`);
  console.log(`  Válido por: ${OTP_EXPIRY_MINUTES} minutos`);
  console.log(`========================================\n`);
}

export const requestToken = async (req: Request, res: Response): Promise<void> => {
  const { id: documentId } = req.params;
  const { action } = req.body;
  const authReq = req as any;
  const userId = authReq.user?.id;
  const userEmail = authReq.user?.email;
  const userName = authReq.user?.name;

  if (!userId) { res.status(401).json({ error: 'No autenticado' }); return; }
  if (!action || !['APPROVE', 'REJECT'].includes(action)) { res.status(400).json({ error: 'Acción inválida. Use APPROVE o REJECT' }); return; }

  try {
    const [docRows]: any = await pool.query('SELECT * FROM Document WHERE id = ?', [documentId]);
    if (!docRows.length) { res.status(404).json({ error: 'Documento no encontrado' }); return; }

    if (docRows[0].status === 'APPROVED') { res.status(400).json({ error: 'El documento ya fue aprobado' }); return; }

    // Revoke pending tokens for this user+document+action
    await pool.query('UPDATE ApprovalToken SET status = ? WHERE userId = ? AND documentId = ? AND status = ?', ['EXPIRED', userId, documentId, 'PENDING']);

    const otp = generateOTP();
    const tokenHash = await bcrypt.hash(otp, 10);
    const tokenId = uuidv4();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await pool.query(
      'INSERT INTO ApprovalToken (id, userId, documentId, tokenHash, action, status, expiresAt) VALUES (?,?,?,?,?,?,?)',
      [tokenId, userId, documentId, tokenHash, action, 'PENDING', expiresAt]
    );

    await sendTokenEmail(userEmail, otp, docRows[0].name.split('|')[0], action === 'APPROVE' ? 'APROBAR' : 'RECHAZAR');
    cache.del('documents_all');

    res.json({ success: true, message: `Token enviado a ${userEmail}. Revise su correo.`, tokenId, expiresIn: `${OTP_EXPIRY_MINUTES} minutos` });
  } catch (error) {
    console.error('Error requesting token:', error);
    res.status(500).json({ error: 'Error al generar token' });
  }
};

export const signDocument = async (req: Request, res: Response): Promise<void> => {
  const { id: documentId } = req.params;
  const { token, comment } = req.body;
  const authReq = req as any;
  const userId = authReq.user?.id;
  const userName = authReq.user?.name;

  if (!userId) { res.status(401).json({ error: 'No autenticado' }); return; }
  if (!token || token.length !== OTP_LENGTH) { res.status(400).json({ error: 'Token inválido. Debe ser de 6 dígitos.' }); return; }

  try {
    const [docRows]: any = await pool.query('SELECT * FROM Document WHERE id = ?', [documentId]);
    if (!docRows.length) { res.status(404).json({ error: 'Documento no encontrado' }); return; }

    const [tokenRows]: any = await pool.query(
      'SELECT * FROM ApprovalToken WHERE userId = ? AND documentId = ? AND status = ? AND expiresAt > NOW() ORDER BY createdAt DESC LIMIT 1',
      [userId, documentId, 'PENDING']
    );

    if (!tokenRows.length) {
      res.status(400).json({ error: 'No hay token pendiente. Solicite uno nuevo con el botón "Firmar".' });
      return;
    }

    const pendingToken = tokenRows[0];
    const isValid = await bcrypt.compare(token, pendingToken.tokenHash);

    if (!isValid) {
      res.status(403).json({ error: 'Token incorrecto. Verifique el código recibido por correo.' });
      return;
    }

    // Mark token as used
    await pool.query('UPDATE ApprovalToken SET status = ? WHERE id = ?', ['USED', pendingToken.id]);

    // Record the approval
    const approvalId = uuidv4();
    const action = pendingToken.action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    await pool.query(
      'INSERT INTO DocumentApproval (id, documentId, userId, action, tokenHash, comment) VALUES (?,?,?,?,?,?)',
      [approvalId, documentId, userId, action, pendingToken.tokenHash, comment || '']
    );

    // Update document status
    const newStatus = action === 'APPROVED' ? 'REVIEWED' : 'ISSUES_FOUND';
    await pool.query('UPDATE Document SET status = ?, reviewer = ? WHERE id = ?', [newStatus, userName, documentId]);

    // Activity log
    const activityId = uuidv4();
    await pool.query(
      'INSERT INTO Activity (id, action, description, userId, standardId) VALUES (?,?,?,?,?)',
      [activityId, 'Documento Firmado', `${userName} ${action === 'APPROVED' ? 'aprobó' : 'rechazó'} el documento "${docRows[0].name.split('|')[0]}" con firma electrónica.`, userId, docRows[0].standardId]
    );

    cache.del('documents_all');
    cache.del('dashboard_stats');
    cache.del('dashboard_activities');

    res.json({ success: true, action, message: `Documento ${action === 'APPROVED' ? 'aprobado' : 'rechazado'} exitosamente por ${userName}.` });
  } catch (error) {
    console.error('Error signing document:', error);
    res.status(500).json({ error: 'Error al firmar documento' });
  }
};

export const getApprovalHistory = async (req: Request, res: Response): Promise<void> => {
  const { id: documentId } = req.params;
  try {
    const [rows]: any = await pool.query(
      `SELECT da.*, u.name as userName, u.email as userEmail
       FROM DocumentApproval da
       JOIN User u ON da.userId = u.id
       WHERE da.documentId = ?
       ORDER BY da.createdAt DESC`,
      [documentId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error getting approval history:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};
