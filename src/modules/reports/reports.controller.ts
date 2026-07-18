import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/async-handler';
import { paymentService } from '../payments/services/payment.service';
import {
  revenueQuerySchema,
  revenueDrilldownQuerySchema,
  periodReportQuerySchema,
} from '../payments/validators/payment.validators';
import { resolveScopedCenterId } from '../../shared/utils/center-scope';

function resolveCenterId(req: Request): string | undefined {
  return resolveScopedCenterId(req, req.query.centerId as string | undefined);
}

/**
 * GET /api/v1/reports/revenue
 */
export const getRevenueReport = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const parsed = revenueQuerySchema.parse(req.query);
    const result = await paymentService.getRevenue({
      centerId: parsed.centerId || resolveCenterId(req),
      classId: parsed.classId,
      period: parsed.period,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      view: parsed.view || 'summary',
      year: parsed.year,
      month: parsed.month,
    });
    res.json({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  }
);

/**
 * GET /api/v1/reports/revenue/drilldown
 */
export const getRevenueDrilldown = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const parsed = revenueDrilldownQuerySchema.parse(req.query);
    const result = await paymentService.getRevenueDrilldown(parsed.classId, {
      centerId: parsed.centerId || resolveCenterId(req),
      year: parsed.year,
      month: parsed.month,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
    });
    res.json({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  }
);

/**
 * GET /api/v1/reports/monthly
 */
export const getMonthlyReport = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const parsed = periodReportQuerySchema.parse(req.query);
    const result = await paymentService.getMonthlyReport(
      parsed.centerId || resolveCenterId(req),
      parsed.year,
      parsed.month
    );
    res.json({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  }
);

/**
 * GET /api/v1/reports/yearly
 */
export const getYearlyReport = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const parsed = periodReportQuerySchema.parse(req.query);
    const result = await paymentService.getYearlyReport(
      parsed.centerId || resolveCenterId(req),
      parsed.year
    );
    res.json({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  }
);
