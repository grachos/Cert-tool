import { Router } from 'express';
import { getEvidence, createEvidence, reviewEvidence } from '../controllers/evidence.controller';
import { requireRole } from '../middleware/auth.middleware';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireUocAccess } from '../middleware/uoc.middleware';
import {
  loadPlantationScope,
  requireCentralRole,
  requirePlantationWrite
} from '../middleware/plantation.middleware';

const router = Router();

router.use(authenticateToken);
router.use(requireUocAccess());
router.use(loadPlantationScope);
router.get('/', getEvidence);
router.post('/', requirePlantationWrite, requireRole(['SUPERADMIN','ADMIN','MILL_ADMIN','MANAGER','SUSTAINABILITY','COORDINATOR','AUDITOR','PROCESS_OWNER','PLANT_ADMIN','PLANTATION_ADMIN','PLANTATION_OPERATOR','USER']), createEvidence);
router.put('/:id/review', requireCentralRole, requireRole(['SUPERADMIN','ADMIN','MILL_ADMIN','MANAGER','AUDITOR','TECHNICAL_REVIEWER']), reviewEvidence);

export default router;
