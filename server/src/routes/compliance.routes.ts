import { Router } from 'express';
import { 
  getStandardsCompliance, 
  getStandardRequirements,
  updateStandard,
  createRequirement,
  updateRequirement,
  deleteRequirement
} from '../controllers/compliance.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/standards', getStandardsCompliance);
router.get('/standards/:id', getStandardRequirements);
router.put('/standards/:id', requireRole(['SUPERADMIN']), updateStandard);
router.post('/requirements', requireRole(['SUPERADMIN']), createRequirement);
router.put('/requirements/:id', requireRole(['SUPERADMIN']), updateRequirement);
router.delete('/requirements/:id', requireRole(['SUPERADMIN']), deleteRequirement);

export default router;
