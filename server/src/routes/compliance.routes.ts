import { Router } from 'express';
import { 
  getStandardsCompliance, 
  getStandardRequirements,
  updateStandard,
  createRequirement,
  updateRequirement,
  deleteRequirement
} from '../controllers/compliance.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/standards', getStandardsCompliance);
router.get('/standards/:id', getStandardRequirements);
router.put('/standards/:id', updateStandard);
router.post('/requirements', createRequirement);
router.put('/requirements/:id', updateRequirement);
router.delete('/requirements/:id', deleteRequirement);

export default router;
