import { Router } from 'express';
import { getEvidence, createEvidence } from '../controllers/evidence.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireUocAccess } from '../middleware/uoc.middleware';

const router = Router();

router.use(authenticateToken);
router.use(requireUocAccess());
router.get('/', getEvidence);
router.post('/', createEvidence);

export default router;
