import { Router } from 'express';
import { authenticate } from '../auth/middleware/authenticate';
import { requirePermission } from '../rbac/middleware/require-permission';
import {
  getRevenueReport,
  getRevenueDrilldown,
  getMonthlyReport,
  getYearlyReport,
} from './reports.controller';

const router = Router();

router.use(authenticate);

router.get('/revenue', requirePermission('reports.read'), getRevenueReport);
router.get('/revenue/drilldown', requirePermission('reports.read'), getRevenueDrilldown);
router.get('/monthly', requirePermission('reports.read'), getMonthlyReport);
router.get('/yearly', requirePermission('reports.read'), getYearlyReport);

export default router;
