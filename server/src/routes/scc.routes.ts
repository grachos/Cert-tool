import { Router } from 'express';
import { getUocs, createUoc, getTransactions, createTransaction, getSccDashboard } from '../controllers/scc.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { requireUocAccess } from '../middleware/uoc.middleware';

const router = Router();
router.use(authenticateToken);

router.get('/uocs', getUocs);
router.post('/uocs', requireRole(['ADMIN']), createUoc);
router.get('/transactions', requireUocAccess(), getTransactions);
router.post('/transactions', requireUocAccess(), createTransaction);
router.get('/dashboard', requireUocAccess({ allowAllForAdmin: true }), getSccDashboard);

export default router;
