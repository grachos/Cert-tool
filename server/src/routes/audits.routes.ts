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
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { requireUocAccess } from '../middleware/uoc.middleware';

const router = Router();

router.use(authenticateToken);
router.use(requireUocAccess());

router.get('/', getAudits);
router.post('/', requireRole(['SUPERADMIN','ADMIN','MANAGER','SUSTAINABILITY','COORDINATOR','AUDITOR']), createAudit);

router.get('/requirements', getAllRequirements);
router.get('/findings/all', getAllFindings);

router.get('/:id/findings', getAuditFindings);
router.post('/:id/findings', requireRole(['SUPERADMIN','ADMIN','MANAGER','SUSTAINABILITY','COORDINATOR','AUDITOR']), createFinding);

router.post('/findings/:id/verify-closure', requireRole(['SUPERADMIN','ADMIN','MANAGER','SUSTAINABILITY','COORDINATOR','AUDITOR']), verifyFindingClosure);
router.post('/findings/:id/ai-verify', requireRole(['SUPERADMIN','ADMIN','MANAGER','SUSTAINABILITY','COORDINATOR','AUDITOR']), verifyFindingClosure);

export default router;
