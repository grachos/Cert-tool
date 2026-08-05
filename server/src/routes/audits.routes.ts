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
import { loadPlantationScope, requireCentralRole } from '../middleware/plantation.middleware';

const router = Router();

router.use(authenticateToken);
router.use(requireUocAccess());
router.use(loadPlantationScope);

router.get('/', requireCentralRole, getAudits);
router.post('/', requireCentralRole, requireRole(['SUPERADMIN','ADMIN','MILL_ADMIN','MANAGER','SUSTAINABILITY','COORDINATOR','AUDITOR']), createAudit);

router.get('/requirements', getAllRequirements);
router.get('/findings/all', getAllFindings);

router.get('/:id/findings', getAuditFindings);
router.post('/:id/findings', requireCentralRole, requireRole(['SUPERADMIN','ADMIN','MILL_ADMIN','MANAGER','SUSTAINABILITY','COORDINATOR','AUDITOR']), createFinding);

router.post('/findings/:id/verify-closure', requireCentralRole, requireRole(['SUPERADMIN','ADMIN','MILL_ADMIN','MANAGER','SUSTAINABILITY','COORDINATOR','AUDITOR']), verifyFindingClosure);
router.post('/findings/:id/ai-verify', requireCentralRole, requireRole(['SUPERADMIN','ADMIN','MILL_ADMIN','MANAGER','SUSTAINABILITY','COORDINATOR','AUDITOR']), verifyFindingClosure);

export default router;
