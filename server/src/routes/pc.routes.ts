import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { requireUocAccess } from '../middleware/uoc.middleware';
import {
  loadPlantationScope,
  requireCentralRole,
  requirePlantationWrite
} from '../middleware/plantation.middleware';
import {
  approvePcNoApplicability,
  createManagementReview,
  exportPcCsv,
  exportPcExcel,
  exportPcExecutivePdf,
  getManagementReviews,
  getPcIndicator,
  getPcIndicators,
  getPcSummary,
  updateManagementReview,
  updatePcEvaluation
} from '../controllers/pc.controller';

const router = Router();
const editors = ['SUPERADMIN','ADMIN','MILL_ADMIN','MANAGER','SUSTAINABILITY','COORDINATOR','AUDITOR','PROCESS_OWNER','PLANT_ADMIN','PLANTATION_ADMIN','PLANTATION_OPERATOR'];
const approvers = ['SUPERADMIN','ADMIN','MILL_ADMIN','MANAGER','SUSTAINABILITY','COORDINATOR','AUDITOR'];
const reviewManagers = ['SUPERADMIN','ADMIN','MILL_ADMIN','MANAGER','SUSTAINABILITY','COORDINATOR'];

router.use(authenticateToken);
router.use(requireUocAccess());
router.use(loadPlantationScope);
router.get('/summary', getPcSummary);
router.get('/indicators', getPcIndicators);
router.get('/indicators/:id', getPcIndicator);
router.put('/indicators/:id/evaluation', requirePlantationWrite, requireRole(editors), updatePcEvaluation);
router.post('/indicators/:id/no-applicability/approval', requireCentralRole, requireRole(approvers), approvePcNoApplicability);
router.get('/management-reviews', requireCentralRole, getManagementReviews);
router.post('/management-reviews', requireCentralRole, requireRole(reviewManagers), createManagementReview);
router.put('/management-reviews/:id', requireCentralRole, requireRole(reviewManagers), updateManagementReview);
router.get('/reports/matrix.csv', requireCentralRole, exportPcCsv);
router.get('/reports/matrix.xls', requireCentralRole, exportPcExcel);
router.get('/reports/executive.pdf', requireCentralRole, exportPcExecutivePdf);

export default router;
