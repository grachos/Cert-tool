import { Router } from 'express';
import { requestToken, signDocument, getApprovalHistory } from '../controllers/approvals.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticateToken);

router.post('/documents/:id/request-token', requestToken);
router.post('/documents/:id/sign', signDocument);
router.get('/documents/:id/history', getApprovalHistory);

export default router;
