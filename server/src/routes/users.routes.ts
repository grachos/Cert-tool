import { Router } from 'express';
import { getUsers, createUser, updateUser, updateUserRole, deleteUser } from '../controllers/users.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren token y rol de ADMIN
router.use(authenticateToken);
router.use(requireRole(['ADMIN']));

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id/role', updateUserRole);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
