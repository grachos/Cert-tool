import { Router } from 'express';
import multer from 'multer';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { requireUocAccess } from '../middleware/uoc.middleware';
import {
  createDelivery, createFarmPlot, createPlantationActivity, createPrismaOperation, createSupplySource,
  listDeliveries, listFarmPlots, listPlantationActivities, listPrismaOperations, listSupplySources,
  listTraceabilityAlerts, updateDelivery, updatePrismaOperation, updateSupplySource
  ,listSupplySourceHistory, updateFarmPlot, updatePlantationActivity, listPrismaAdjustments, listPrismaAttachments, addPrismaAttachment,
  analyzeFarmPlotKml, listFarmPlotSoilStudies
} from '../controllers/rspo.controller';

const router = Router();
const kmlUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
router.use(authenticateToken);
router.use(requireUocAccess());

router.get('/supply-sources', listSupplySources);
router.post('/supply-sources', requireRole(['ADMIN','MANAGER']), createSupplySource);
router.put('/supply-sources/:id', requireRole(['ADMIN','MANAGER']), updateSupplySource);
router.get('/supply-sources/:id/history', listSupplySourceHistory);
router.get('/farm-plots', listFarmPlots);
router.post('/farm-plots', requireRole(['ADMIN','MANAGER']), createFarmPlot);
router.put('/farm-plots/:id', requireRole(['ADMIN','MANAGER']), updateFarmPlot);
router.get('/farm-plots/:id/soil-studies', listFarmPlotSoilStudies);
router.post('/farm-plots/:id/soil-studies', requireRole(['ADMIN','MANAGER','AUDITOR']), kmlUpload.single('kml'), analyzeFarmPlotKml);
router.get('/plantation-activities', listPlantationActivities);
router.post('/plantation-activities', requireRole(['ADMIN','MANAGER','AUDITOR']), createPlantationActivity);
router.put('/plantation-activities/:id', requireRole(['ADMIN','MANAGER','AUDITOR']), updatePlantationActivity);
router.get('/deliveries', listDeliveries);
router.post('/deliveries', requireRole(['ADMIN','MANAGER']), createDelivery);
router.put('/deliveries/:id', requireRole(['ADMIN','MANAGER']), updateDelivery);
router.get('/traceability-alerts', listTraceabilityAlerts);
router.get('/prisma-operations', listPrismaOperations);
router.post('/prisma-operations', requireRole(['ADMIN','MANAGER']), createPrismaOperation);
router.put('/prisma-operations/:id', requireRole(['ADMIN','MANAGER']), updatePrismaOperation);
router.get('/prisma-operations/:id/adjustments', listPrismaAdjustments);
router.get('/prisma-operations/:id/attachments', listPrismaAttachments);
router.post('/prisma-operations/:id/attachments', requireRole(['ADMIN','MANAGER']), addPrismaAttachment);

export default router;
