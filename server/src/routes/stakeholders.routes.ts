import { Router } from 'express';
import { getStakeholders, createStakeholder, updateStakeholder, deleteStakeholder } from '../controllers/stakeholders.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticateToken);

router.get('/', getStakeholders);
router.post('/', createStakeholder);
router.put('/:id', updateStakeholder);
router.delete('/:id', deleteStakeholder);

export default router;
