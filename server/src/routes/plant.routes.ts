import { Router } from 'express';
import { createPlantRecord, getPlantRecords, updatePlantRecord } from '../controllers/plant.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { requireUocAccess } from '../middleware/uoc.middleware';

const router = Router();
router.use(authenticateToken);
router.use(requireUocAccess());
router.get('/records', getPlantRecords);
router.post('/records', requireRole(['ADMIN','MANAGER']), createPlantRecord);
router.put('/records/:id', requireRole(['ADMIN','MANAGER','AUDITOR']), updatePlantRecord);

export default router;
