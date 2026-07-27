import { Router } from 'express';
import { getActionPlans, createActionPlan, updateActionPlan } from '../controllers/automation.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireUocAccess } from '../middleware/uoc.middleware';

const router = Router();

router.use(authenticateToken);
router.get('/', requireUocAccess({ allowAllForAdmin: true }), getActionPlans);
router.post('/', requireUocAccess(), createActionPlan);
router.put('/:id', requireUocAccess(), updateActionPlan);

export default router;
