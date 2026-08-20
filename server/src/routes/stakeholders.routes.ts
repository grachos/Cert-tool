import { Router } from 'express';
import { getStakeholders, createStakeholder, updateStakeholder, deleteStakeholder } from '../controllers/stakeholders.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireUocAccess } from '../middleware/uoc.middleware';
import { loadPlantationScope, requireCentralRole } from '../middleware/plantation.middleware';

const router = Router();
router.use(authenticateToken);
router.use(requireUocAccess());
router.use(loadPlantationScope);
router.use(requireCentralRole);

router.get('/', getStakeholders);
router.post('/', createStakeholder);
router.put('/:id', updateStakeholder);
router.delete('/:id', deleteStakeholder);

export default router;
