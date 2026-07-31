import { Router } from 'express';
import { getUocs, createUoc, updateUoc, getTransactions, createTransaction, getSccDashboard } from '../controllers/scc.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { requireUocAccess } from '../middleware/uoc.middleware';

const router = Router();
router.use(authenticateToken);

router.get('/uocs', getUocs);
router.post('/uocs', requireRole(['SUPERADMIN','ADMIN']), createUoc);
router.put('/uocs/:uocId', requireUocAccess(), requireRole(['SUPERADMIN','ADMIN','MANAGER','SUSTAINABILITY','COORDINATOR']), updateUoc);
router.get('/transactions', requireUocAccess(), getTransactions);
router.post('/transactions', requireUocAccess(), createTransaction);
router.get('/dashboard', requireUocAccess({ allowAllForAdmin: true }), getSccDashboard);

export default router;
