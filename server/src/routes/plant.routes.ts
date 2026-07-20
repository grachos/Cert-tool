import { Router } from 'express';
import { getPlantRecords } from '../controllers/plant.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticateToken);
router.get('/records', getPlantRecords);

export default router;
