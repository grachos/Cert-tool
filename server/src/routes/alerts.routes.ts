import { Router } from 'express';
import { getAlerts, createAlert, dismissAlert } from '../controllers/alerts.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticateToken);

router.get('/', getAlerts);
router.post('/', createAlert);
router.put('/:id/dismiss', dismissAlert);

export default router;
