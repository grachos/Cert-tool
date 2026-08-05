import { Router } from 'express';
import { getUocs, createUoc, updateUoc, getTransactions, createTransaction, getSccDashboard } from '../controllers/scc.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { requireUocAccess } from '../middleware/uoc.middleware';
import { loadPlantationScope, requireCentralRole } from '../middleware/plantation.middleware';

const router = Router();
router.use(authenticateToken);

router.get('/uocs', getUocs);
router.post('/uocs', requireRole(['SUPERADMIN','ADMIN']), createUoc);
router.put('/uocs/:uocId', requireUocAccess(), loadPlantationScope, requireCentralRole, requireRole(['SUPERADMIN','ADMIN','MILL_ADMIN','MANAGER','SUSTAINABILITY','COORDINATOR']), updateUoc);
router.get('/transactions', requireUocAccess(), loadPlantationScope, requireCentralRole, getTransactions);
router.post('/transactions', requireUocAccess(), loadPlantationScope, requireCentralRole, createTransaction);
router.get('/dashboard', requireUocAccess({ allowAllForAdmin: true }), loadPlantationScope, requireCentralRole, getSccDashboard);

export default router;
