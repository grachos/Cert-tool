import { Router } from 'express';
import { getStandardsCompliance, getStandardRequirements } from '../controllers/compliance.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/standards', getStandardsCompliance);
router.get('/standards/:id', getStandardRequirements);

export default router;
