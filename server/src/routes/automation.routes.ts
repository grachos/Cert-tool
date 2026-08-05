import { Router } from 'express';
import { getActionPlans, createActionPlan, updateActionPlan } from '../controllers/automation.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { requireUocAccess } from '../middleware/uoc.middleware';
import { loadPlantationScope, requirePlantationWrite } from '../middleware/plantation.middleware';

const router = Router();

router.use(authenticateToken);
router.use(requireUocAccess());
router.use(loadPlantationScope);
router.get('/', getActionPlans);
const editors = ['SUPERADMIN','ADMIN','MILL_ADMIN','MANAGER','SUSTAINABILITY','TECHNICAL_REVIEWER','COORDINATOR','PROCESS_OWNER','PLANT_ADMIN','PLANTATION_ADMIN','PLANTATION_OPERATOR','USER'];
router.post('/', requirePlantationWrite, requireRole(editors), createActionPlan);
router.put('/:id', requirePlantationWrite, requireRole(editors), updateActionPlan);

export default router;
