import { Router } from 'express';
import { getAlerts, createAlert, dismissAlert } from '../controllers/alerts.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { requireUocAccess } from '../middleware/uoc.middleware';

const router = Router();
router.use(authenticateToken);

router.get('/', requireUocAccess({ allowAllForAdmin: true }), getAlerts);
router.post('/', requireUocAccess(), requireRole(['SUPERADMIN','ADMIN','MANAGER','SUSTAINABILITY','COORDINATOR','AUDITOR']), createAlert);
router.put('/:id/dismiss', requireUocAccess(), dismissAlert);

export default router;
