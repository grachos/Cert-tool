import { Router } from 'express';
import multer from 'multer';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { requireUocAccess } from '../middleware/uoc.middleware';
import {
  loadPlantationScope,
  requireCentralRole,
  requirePlantationWrite
} from '../middleware/plantation.middleware';
import {
  createDelivery, createFarmPlot, createPlantationActivity, createPrismaOperation, createSupplySource,
  listDeliveries, listFarmPlots, listPlantationActivities, listPrismaOperations, listSupplySources,
  listTraceabilityAlerts, updateDelivery, updatePrismaOperation, updateSupplySource
  ,listSupplySourceHistory, updateFarmPlot, updatePlantationActivity, listPrismaAdjustments, listPrismaAttachments, addPrismaAttachment,
  analyzeFarmPlotKml, listFarmPlotSoilStudies, listPlantationLots, createPlantationLot, updatePlantationLot,
  listPlantationResidents, createPlantationResident, updatePlantationResident
} from '../controllers/rspo.controller';

const router = Router();
const kmlUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
router.use(authenticateToken);
router.use(requireUocAccess());
router.use(loadPlantationScope);

router.get('/supply-sources', listSupplySources);
router.post('/supply-sources', requireCentralRole, createSupplySource);
router.put('/supply-sources/:id', requireCentralRole, updateSupplySource);
router.get('/supply-sources/:id/history', listSupplySourceHistory);
router.get('/farm-plots', listFarmPlots);
router.post('/farm-plots', requireCentralRole, createFarmPlot);
router.put('/farm-plots/:id', requirePlantationWrite, requireRole(['SUPERADMIN','ADMIN','MILL_ADMIN','MANAGER','PLANT_ADMIN','PLANTATION_ADMIN']), updateFarmPlot);
router.get('/farm-plots/:id/soil-studies', listFarmPlotSoilStudies);
router.post('/farm-plots/:id/soil-studies', requirePlantationWrite, requireRole(['SUPERADMIN','ADMIN','MILL_ADMIN','MANAGER','AUDITOR','PLANT_ADMIN','PLANTATION_ADMIN','PLANTATION_OPERATOR']), kmlUpload.single('kml'), analyzeFarmPlotKml);
router.get('/plantation-lots', listPlantationLots);
router.post('/plantation-lots', requirePlantationWrite, requireRole(['SUPERADMIN','ADMIN','MILL_ADMIN','MANAGER','PLANT_ADMIN','PLANTATION_ADMIN','PLANTATION_OPERATOR']), createPlantationLot);
router.put('/plantation-lots/:id', requirePlantationWrite, requireRole(['SUPERADMIN','ADMIN','MILL_ADMIN','MANAGER','PLANT_ADMIN','PLANTATION_ADMIN','PLANTATION_OPERATOR']), updatePlantationLot);
router.get('/plantation-residents', listPlantationResidents);
router.post('/plantation-residents', requirePlantationWrite, requireRole(['SUPERADMIN','ADMIN','MILL_ADMIN','MANAGER','PLANT_ADMIN','PLANTATION_ADMIN']), createPlantationResident);
router.put('/plantation-residents/:id', requirePlantationWrite, requireRole(['SUPERADMIN','ADMIN','MILL_ADMIN','MANAGER','PLANT_ADMIN','PLANTATION_ADMIN']), updatePlantationResident);
router.get('/plantation-activities', listPlantationActivities);
router.post('/plantation-activities', requirePlantationWrite, requireRole(['SUPERADMIN','ADMIN','MILL_ADMIN','MANAGER','AUDITOR','PLANT_ADMIN','PLANTATION_ADMIN','PLANTATION_OPERATOR']), createPlantationActivity);
router.put('/plantation-activities/:id', requirePlantationWrite, requireRole(['SUPERADMIN','ADMIN','MILL_ADMIN','MANAGER','AUDITOR','PLANT_ADMIN','PLANTATION_ADMIN','PLANTATION_OPERATOR']), updatePlantationActivity);
router.get('/deliveries', requireCentralRole, listDeliveries);
router.post('/deliveries', requireCentralRole, createDelivery);
router.put('/deliveries/:id', requireCentralRole, updateDelivery);
router.get('/traceability-alerts', requireCentralRole, listTraceabilityAlerts);
router.get('/prisma-operations', requireCentralRole, listPrismaOperations);
router.post('/prisma-operations', requireCentralRole, createPrismaOperation);
router.put('/prisma-operations/:id', requireCentralRole, updatePrismaOperation);
router.get('/prisma-operations/:id/adjustments', requireCentralRole, listPrismaAdjustments);
router.get('/prisma-operations/:id/attachments', requireCentralRole, listPrismaAttachments);
router.post('/prisma-operations/:id/attachments', requireCentralRole, addPrismaAttachment);

export default router;
