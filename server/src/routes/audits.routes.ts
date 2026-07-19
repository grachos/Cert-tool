import { Router } from 'express';
import { 
  getAudits, 
  createAudit, 
  getAuditFindings, 
  createFinding, 
  verifyFindingClosure,
  getAllRequirements,
  getAllFindings
} from '../controllers/audits.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getAudits);
router.post('/', createAudit);

router.get('/requirements', getAllRequirements);
router.get('/findings/all', getAllFindings);

router.get('/:id/findings', getAuditFindings);
router.post('/:id/findings', createFinding);

// Special AI endpoint
router.post('/findings/:id/ai-verify', verifyFindingClosure);

export default router;
