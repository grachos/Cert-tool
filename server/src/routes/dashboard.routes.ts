import { Router } from 'express';
import { getStats, getActivities } from '../controllers/dashboard.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/stats', getStats);
router.get('/activities', getActivities);

export default router;
