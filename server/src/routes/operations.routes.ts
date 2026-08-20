import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { requireUocAccess } from '../middleware/uoc.middleware';
import { loadPlantationScope, requirePlantationWrite } from '../middleware/plantation.middleware';
import {
  createOperationalRecord,
  getOperationalSummary,
  linkOperationalEvidence,
  listOperationalRecords,
  updateOperationalRecord
} from '../controllers/operations.controller';

const router = Router();
const editors = [
  'SUPERADMIN','ADMIN','MILL_ADMIN','MANAGER','SUSTAINABILITY',
  'TECHNICAL_REVIEWER','COORDINATOR','PROCESS_OWNER','PLANT_ADMIN',
  'PLANTATION_ADMIN','PLANTATION_OPERATOR','USER'
];

router.use(authenticateToken);
router.use(requireUocAccess());
router.use(loadPlantationScope);
router.get('/', listOperationalRecords);
router.get('/summary', getOperationalSummary);
router.post('/', requirePlantationWrite, requireRole(editors), createOperationalRecord);
router.put('/:id', requirePlantationWrite, requireRole(editors), updateOperationalRecord);
router.post('/:id/evidence', requirePlantationWrite, requireRole(editors), linkOperationalEvidence);

export default router;
