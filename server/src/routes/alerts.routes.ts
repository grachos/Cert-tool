import { Router } from 'express';
import { getAlerts, createAlert, dismissAlert } from '../controllers/alerts.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { requireUocAccess } from '../middleware/uoc.middleware';
import {
  loadPlantationScope,
  requireCentralRole,
  requirePlantationWrite
} from '../middleware/plantation.middleware';

const router = Router();
router.use(authenticateToken);

router.get('/', requireUocAccess({ allowAllForAdmin: true }), loadPlantationScope, getAlerts);
router.post('/', requireUocAccess(), loadPlantationScope, requireCentralRole, requireRole(['SUPERADMIN','ADMIN','MILL_ADMIN','MANAGER','SUSTAINABILITY','COORDINATOR','AUDITOR']), createAlert);
router.put('/:id/dismiss', requireUocAccess(), loadPlantationScope, requirePlantationWrite, dismissAlert);

export default router;
