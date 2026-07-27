import { Router } from 'express';
import { getRisks, createRisk } from '../controllers/risks.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { requireUocAccess } from '../middleware/uoc.middleware';

const router = Router();

router.use(authenticateToken);
router.use(requireUocAccess());
router.get('/', getRisks);
router.post('/', requireRole(['ADMIN', 'MANAGER', 'AUDITOR']), createRisk);

export default router;
