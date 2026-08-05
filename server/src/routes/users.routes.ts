import { Router } from 'express';
import {
  getUsers, createUser, updateUser, updateUserRole, deleteUser,
  getUserUocs, assignUserUoc, removeUserUoc,
  getUserPlantations, assignUserPlantation, removeUserPlantation
} from '../controllers/users.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren token y rol de ADMIN
router.use(authenticateToken);
router.use(requireRole(['SUPERADMIN','ADMIN','MILL_ADMIN','MANAGER']));

router.get('/', getUsers);
router.get('/:id/uocs', getUserUocs);
router.post('/:id/uocs', assignUserUoc);
router.delete('/:id/uocs/:uocId', removeUserUoc);
router.get('/:id/plantations', getUserPlantations);
router.post('/:id/plantations', assignUserPlantation);
router.delete('/:id/plantations/:farmPlotId', removeUserPlantation);
router.post('/', createUser);
router.put('/:id/role', updateUserRole);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
