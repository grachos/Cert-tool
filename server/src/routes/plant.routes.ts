import { Router } from 'express';
import { createPlantRecord, getPlantRecords, updatePlantRecord } from '../controllers/plant.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { requireUocAccess } from '../middleware/uoc.middleware';
import { loadPlantationScope, requireCentralRole } from '../middleware/plantation.middleware';

const router = Router();
router.use(authenticateToken);
router.use(requireUocAccess());
router.use(loadPlantationScope);
router.use(requireCentralRole);
router.get('/records', getPlantRecords);
router.post('/records', requireRole(['SUPERADMIN','ADMIN','MILL_ADMIN','MANAGER']), createPlantRecord);
router.put('/records/:id', requireRole(['SUPERADMIN','ADMIN','MILL_ADMIN','MANAGER','AUDITOR']), updatePlantRecord);

export default router;
