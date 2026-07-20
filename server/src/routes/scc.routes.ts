import { Router } from 'express';
import { getUocs, createUoc, getTransactions, createTransaction, getSccDashboard } from '../controllers/scc.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticateToken);

router.get('/uocs', getUocs);
router.post('/uocs', createUoc);
router.get('/transactions', getTransactions);
router.post('/transactions', createTransaction);
router.get('/dashboard', getSccDashboard);

export default router;
