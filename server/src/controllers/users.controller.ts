import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import { canAccessUoc, getAuthorizedUocIds } from '../middleware/uoc.middleware';

const VALID_ROLES = new Set([
  'SUPERADMIN','ADMIN','MILL_ADMIN','MANAGER','SUSTAINABILITY',
  'TECHNICAL_REVIEWER','REVIEWER','AUDITOR','CERTIFIER','COORDINATOR',
  'PROCESS_OWNER','PLANT_ADMIN','PLANTATION_ADMIN','PLANTATION_OPERATOR',
  'VIEWER','READ_ONLY','USER'
]);

const MILL_ASSIGNABLE_ROLES = new Set([
  'TECHNICAL_REVIEWER','REVIEWER','AUDITOR','PROCESS_OWNER',
  'PLANTATION_ADMIN','PLANTATION_OPERATOR','VIEWER','READ_ONLY','USER'
]);

function validateRoleForRequester(requesterRole: string, targetRole: string) {
  if (!VALID_ROLES.has(targetRole)) return false;
  if (['SUPERADMIN','ADMIN'].includes(requesterRole)) return true;
  return MILL_ASSIGNABLE_ROLES.has(targetRole);
}

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as any;
    const authorizedUocs = await getAuthorizedUocIds(authReq.user);
    if (authorizedUocs && !authorizedUocs.length) { res.json([]); return; }
    // MariaDB 10.4 (incluido en XAMPP) no dispone de JSON_ARRAYAGG.
    // Consultamos usuarios y asignaciones por separado para mantener compatibilidad.
    const [userRows] = await db.query(
      authorizedUocs
        ? `SELECT DISTINCT u.id,u.email,u.name,u.role,u.createdAt
           FROM User u JOIN UserCertificationUnit ucu ON ucu.userId=u.id
           WHERE ucu.uocId IN (${authorizedUocs.map(() => '?').join(',')})
           ORDER BY u.createdAt DESC`
        : 'SELECT id, email, name, role, createdAt FROM User ORDER BY createdAt DESC',
      authorizedUocs || []
    );
    const [assignmentRows] = await db.query(
      `SELECT ucu.userId, cu.id, cu.name
       FROM UserCertificationUnit ucu
       JOIN CertificationUnit cu ON cu.id=ucu.uocId
       ${authorizedUocs ? `WHERE cu.id IN (${authorizedUocs.map(() => '?').join(',')})` : ''}
       ORDER BY cu.name`,
      authorizedUocs || []
    );
    const visibleUserIds = (userRows as any[]).map(user => user.id);
    const [plantationRows] = visibleUserIds.length
      ? await db.query(
        `SELECT upa.userId,upa.id,upa.uocId,upa.farmPlotId,upa.accessLevel,upa.status,
                COALESCE(fp.farmName,fp.name) plantationName
         FROM UserPlantationAccess upa
         JOIN FarmPlot fp ON fp.id=upa.farmPlotId
         WHERE upa.userId IN (${visibleUserIds.map(() => '?').join(',')})
         ORDER BY plantationName`,
        visibleUserIds
      )
      : [[] as any[]];
    const assignmentsByUser = new Map<string, Array<{ id: string; name: string }>>();
    for (const assignment of assignmentRows as any[]) {
      const current = assignmentsByUser.get(assignment.userId) || [];
      current.push({ id: assignment.id, name: assignment.name });
      assignmentsByUser.set(assignment.userId, current);
    }
    res.status(200).json((userRows as any[]).map(user => ({
      ...user,
      assignedUocs: assignmentsByUser.get(user.id) || [],
      assignedPlantations: (plantationRows as any[]).filter(row => row.userId === user.id)
    })));
  } catch (error) { console.error(error); res.status(500).json({ error: 'Error al obtener usuarios.' }); }
};

export const getUserUocs = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  const authorizedUocs = await getAuthorizedUocIds(authReq.user);
  const [rows] = await db.query(
    `SELECT cu.* FROM CertificationUnit cu
     JOIN UserCertificationUnit ucu ON ucu.uocId=cu.id
     WHERE ucu.userId=?
     ${authorizedUocs ? `AND cu.id IN (${authorizedUocs.map(() => '?').join(',')})` : ''}
     ORDER BY cu.name`, [req.params.id, ...(authorizedUocs || [])]
  );
  res.json(rows);
};

export const assignUserUoc = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  const userId = String(req.params.id);
  const uocId = String(req.body.uocId || '');
  if (!uocId) { res.status(400).json({ error: 'La UoC es obligatoria.' }); return; }
  if (authReq.user?.id === userId) { res.status(400).json({ error: 'No puede modificar su propia asignación.' }); return; }
  if (!(await canAccessUoc(authReq.user, uocId))) { res.status(403).json({ error: 'No administra esta UoC.' }); return; }
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
  if (!(await canAccessUoc(authReq.user, uocId))) { res.status(403).json({ error: 'No administra esta UoC.' }); return; }
  await db.query('DELETE FROM UserPlantationAccess WHERE userId=? AND uocId=?', [userId, uocId]);
  const [result]: any = await db.query('DELETE FROM UserCertificationUnit WHERE userId=? AND uocId=?', [userId, uocId]);
  if (!result.affectedRows) { res.status(404).json({ error: 'Asignación no encontrada.' }); return; }
  res.json({ message: 'Asignación retirada.' });
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, role } = req.body;
    const authReq = req as any;
    if (!validateRoleForRequester(authReq.user?.role, role)) { res.status(403).json({ error: 'No puede asignar ese rol.' }); return; }
    if (!password || String(password).length < 8) { res.status(400).json({ error: 'La contraseña debe tener mínimo 8 caracteres.' }); return; }
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
    if (!validateRoleForRequester((req as any).user?.role, role)) { res.status(403).json({ error: 'No puede asignar ese rol.' }); return; }
    await db.query('UPDATE User SET role = ? WHERE id = ?', [role, id]);
    const [userRows] = await db.query('SELECT id, email, name, role FROM User WHERE id = ?', [id]);
    res.status(200).json((userRows as any[])[0]);
  } catch (error) { console.error(error); res.status(500).json({ error: 'Error al actualizar rol.' }); }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, role, password } = req.body;
    if (!validateRoleForRequester((req as any).user?.role, role)) { res.status(403).json({ error: 'No puede asignar ese rol.' }); return; }
    if (password && String(password).length < 8) { res.status(400).json({ error: 'La contraseña debe tener mínimo 8 caracteres.' }); return; }
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

export const getUserPlantations = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  const uocId = String(req.query.uocId || '');
  if (!uocId || !(await canAccessUoc(authReq.user, uocId))) {
    res.status(403).json({ error: 'No administra esta UoC.' });
    return;
  }
  const [rows] = await db.query(
    `SELECT fp.id farmPlotId,fp.uocId,COALESCE(fp.farmName,fp.name) plantationName,
            ss.name producerName,upa.id assignmentId,upa.accessLevel,upa.status
     FROM FarmPlot fp
     JOIN SupplySource ss ON ss.id=fp.supplySourceId
     LEFT JOIN UserPlantationAccess upa
       ON upa.farmPlotId=fp.id AND upa.userId=?
     WHERE fp.uocId=?
     ORDER BY plantationName`,
    [req.params.id, uocId]
  );
  res.json(rows);
};

export const assignUserPlantation = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  const userId = String(req.params.id);
  const farmPlotId = String(req.body.farmPlotId || '');
  const accessLevel = String(req.body.accessLevel || 'VIEWER');
  if (!['ADMIN','OPERATOR','VIEWER'].includes(accessLevel)) {
    res.status(400).json({ error: 'Nivel de acceso no válido.' });
    return;
  }
  if (authReq.user?.id === userId) {
    res.status(400).json({ error: 'No puede modificar su propia asignación.' });
    return;
  }
  const [plots] = await db.query('SELECT id,uocId FROM FarmPlot WHERE id=?', [farmPlotId]);
  const plot = (plots as any[])[0];
  if (!plot) { res.status(404).json({ error: 'Plantación no encontrada.' }); return; }
  if (!(await canAccessUoc(authReq.user, plot.uocId))) {
    res.status(403).json({ error: 'No administra esta UoC.' });
    return;
  }
  const [users] = await db.query('SELECT id,role FROM User WHERE id=?', [userId]);
  const target = (users as any[])[0];
  if (!target) { res.status(404).json({ error: 'Usuario no encontrado.' }); return; }
  if (!['PLANTATION_ADMIN','PLANTATION_OPERATOR','USER','VIEWER','READ_ONLY'].includes(target.role)) {
    res.status(400).json({ error: 'El rol del usuario no corresponde a un portal de plantación.' });
    return;
  }
  await db.query('INSERT IGNORE INTO UserCertificationUnit (userId,uocId) VALUES (?,?)', [userId, plot.uocId]);
  await db.query(
    `INSERT INTO UserPlantationAccess
     (id,userId,uocId,farmPlotId,accessLevel,status,assignedBy)
     VALUES (?,?,?,?,?,'ACTIVE',?)
     ON DUPLICATE KEY UPDATE uocId=VALUES(uocId),accessLevel=VALUES(accessLevel),
       status='ACTIVE',assignedBy=VALUES(assignedBy)`,
    [uuidv4(), userId, plot.uocId, farmPlotId, accessLevel, authReq.user.id]
  );
  res.status(201).json({ userId, uocId: plot.uocId, farmPlotId, accessLevel, status: 'ACTIVE' });
};

export const removeUserPlantation = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as any;
  const userId = String(req.params.id);
  const farmPlotId = String(req.params.farmPlotId);
  if (authReq.user?.id === userId) {
    res.status(400).json({ error: 'No puede modificar su propia asignación.' });
    return;
  }
  const [plots] = await db.query('SELECT uocId FROM FarmPlot WHERE id=?', [farmPlotId]);
  const plot = (plots as any[])[0];
  if (!plot || !(await canAccessUoc(authReq.user, plot.uocId))) {
    res.status(403).json({ error: 'No administra esta plantación.' });
    return;
  }
  const [result]: any = await db.query(
    'DELETE FROM UserPlantationAccess WHERE userId=? AND farmPlotId=?',
    [userId, farmPlotId]
  );
  if (!result.affectedRows) { res.status(404).json({ error: 'Asignación no encontrada.' }); return; }
  res.json({ message: 'Acceso a la plantación retirado.' });
};
