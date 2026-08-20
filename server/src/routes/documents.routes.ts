import { Router } from 'express';
import { getDocuments, createDocument } from '../controllers/documents.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { requireUocAccess } from '../middleware/uoc.middleware';
import { loadPlantationScope, requirePlantationWrite } from '../middleware/plantation.middleware';

const router = Router();

// Todas las rutas de documentos requieren autenticación
router.use(authenticateToken);
router.use(requireUocAccess());
router.use(loadPlantationScope);

router.get('/', getDocuments);
router.post(
  '/',
  requirePlantationWrite,
  requireRole(['SUPERADMIN','ADMIN','MILL_ADMIN','MANAGER','SUSTAINABILITY','COORDINATOR','PROCESS_OWNER','PLANT_ADMIN','PLANTATION_ADMIN','PLANTATION_OPERATOR','USER']),
  createDocument
);

export default router;
