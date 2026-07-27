import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { requireUocAccess } from '../middleware/uoc.middleware';
import {
  createDelivery, createFarmPlot, createPlantationActivity, createPrismaOperation, createSupplySource,
  listDeliveries, listFarmPlots, listPlantationActivities, listPrismaOperations, listSupplySources,
  listTraceabilityAlerts, updateDelivery, updatePrismaOperation, updateSupplySource
} from '../controllers/rspo.controller';

const router = Router();
router.use(authenticateToken);
router.use(requireUocAccess());

router.get('/supply-sources', listSupplySources);
router.post('/supply-sources', requireRole(['ADMIN','MANAGER']), createSupplySource);
router.put('/supply-sources/:id', requireRole(['ADMIN','MANAGER']), updateSupplySource);
router.get('/farm-plots', listFarmPlots);
router.post('/farm-plots', requireRole(['ADMIN','MANAGER']), createFarmPlot);
router.get('/plantation-activities', listPlantationActivities);
router.post('/plantation-activities', requireRole(['ADMIN','MANAGER','AUDITOR']), createPlantationActivity);
router.get('/deliveries', listDeliveries);
router.post('/deliveries', requireRole(['ADMIN','MANAGER']), createDelivery);
router.put('/deliveries/:id', requireRole(['ADMIN','MANAGER']), updateDelivery);
router.get('/traceability-alerts', listTraceabilityAlerts);
router.get('/prisma-operations', listPrismaOperations);
router.post('/prisma-operations', requireRole(['ADMIN','MANAGER']), createPrismaOperation);
router.put('/prisma-operations/:id', requireRole(['ADMIN','MANAGER']), updatePrismaOperation);

export default router;
