import { Router } from 'express';
import { getEvidence, createEvidence } from '../controllers/evidence.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);
router.get('/', getEvidence);
router.post('/', createEvidence);

export default router;
