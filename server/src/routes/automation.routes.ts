import { Router } from 'express';
import { getActionPlans, createActionPlan } from '../controllers/automation.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);
router.get('/', getActionPlans);
router.post('/', createActionPlan);

export default router;
