import { Router } from 'express';
import { getUsers, createUser, updateUser, updateUserRole, deleteUser, getUserUocs, assignUserUoc, removeUserUoc } from '../controllers/users.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren token y rol de ADMIN
router.use(authenticateToken);
router.use(requireRole(['ADMIN']));

router.get('/', getUsers);
router.get('/:id/uocs', getUserUocs);
router.post('/:id/uocs', assignUserUoc);
router.delete('/:id/uocs/:uocId', removeUserUoc);
router.post('/', createUser);
router.put('/:id/role', updateUserRole);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
