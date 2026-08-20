import { Router } from 'express';
import { requestToken, signDocument, getApprovalHistory } from '../controllers/approvals.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireUocAccess } from '../middleware/uoc.middleware';
import { loadPlantationScope, requireCentralRole } from '../middleware/plantation.middleware';

const router = Router();
router.use(authenticateToken);
router.use(requireUocAccess());
router.use(loadPlantationScope);
router.use(requireCentralRole);

router.post('/documents/:id/request-token', requestToken);
router.post('/documents/:id/sign', signDocument);
router.get('/documents/:id/history', getApprovalHistory);

export default router;
