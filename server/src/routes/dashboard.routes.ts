import { Router } from 'express';
import { getStats, getActivities } from '../controllers/dashboard.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireUocAccess } from '../middleware/uoc.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/stats', requireUocAccess({ allowAllForAdmin: true }), getStats);
router.get('/activities', requireUocAccess({ allowAllForAdmin: true }), getActivities);

export default router;
