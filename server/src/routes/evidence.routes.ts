import { Router } from 'express';
import { getEvidence, createEvidence, reviewEvidence } from '../controllers/evidence.controller';
import { requireRole } from '../middleware/auth.middleware';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireUocAccess } from '../middleware/uoc.middleware';

const router = Router();

router.use(authenticateToken);
router.use(requireUocAccess());
router.get('/', getEvidence);
router.post('/', createEvidence);
router.put('/:id/review', requireRole(['ADMIN','MANAGER','AUDITOR']), reviewEvidence);

export default router;
