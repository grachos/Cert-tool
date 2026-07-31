import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { requireUocAccess } from '../middleware/uoc.middleware';
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
const editors = ['SUPERADMIN','ADMIN','MANAGER','SUSTAINABILITY','COORDINATOR','AUDITOR','PROCESS_OWNER','PLANT_ADMIN','PLANTATION_ADMIN'];
const approvers = ['SUPERADMIN','ADMIN','MANAGER','SUSTAINABILITY','COORDINATOR','AUDITOR'];
const reviewManagers = ['SUPERADMIN','ADMIN','MANAGER','SUSTAINABILITY','COORDINATOR'];

router.use(authenticateToken);
router.use(requireUocAccess());
router.get('/summary', getPcSummary);
router.get('/indicators', getPcIndicators);
router.get('/indicators/:id', getPcIndicator);
router.put('/indicators/:id/evaluation', requireRole(editors), updatePcEvaluation);
router.post('/indicators/:id/no-applicability/approval', requireRole(approvers), approvePcNoApplicability);
router.get('/management-reviews', getManagementReviews);
router.post('/management-reviews', requireRole(reviewManagers), createManagementReview);
router.put('/management-reviews/:id', requireRole(reviewManagers), updateManagementReview);
router.get('/reports/matrix.csv', exportPcCsv);
router.get('/reports/matrix.xls', exportPcExcel);
router.get('/reports/executive.pdf', exportPcExecutivePdf);

export default router;
