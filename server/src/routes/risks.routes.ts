import { Router } from 'express';
import { getRisks, createRisk } from '../controllers/risks.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { requireUocAccess } from '../middleware/uoc.middleware';
import { loadPlantationScope, requirePlantationWrite } from '../middleware/plantation.middleware';

const router = Router();

router.use(authenticateToken);
router.use(requireUocAccess());
router.use(loadPlantationScope);
router.get('/', getRisks);
router.post('/', requirePlantationWrite, requireRole(['SUPERADMIN','ADMIN','MILL_ADMIN','MANAGER','AUDITOR','SUSTAINABILITY','PLANTATION_ADMIN','PLANTATION_OPERATOR','USER']), createRisk);

export default router;
