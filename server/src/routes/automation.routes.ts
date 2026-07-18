import { Router } from 'express';
import { getActionPlans, createActionPlan, updateActionPlan } from '../controllers/automation.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);
router.get('/', getActionPlans);
router.post('/', createActionPlan);
router.put('/:id', updateActionPlan);

export default router;
