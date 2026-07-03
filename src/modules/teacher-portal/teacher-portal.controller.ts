import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/async-handler';
import { teacherPortalService } from './teacher-portal.service';

export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  const data = await teacherPortalService.getDashboard(req.user!.id);
  res.json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  });
});

export const getSchedule = asyncHandler(async (req: Request, res: Response) => {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const monthStart = (req.query.monthStart as string) || defaultMonth;
  const data = await teacherPortalService.getSchedule(req.user!.id, monthStart);
  res.json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  });
});

export const getClasses = asyncHandler(async (req: Request, res: Response) => {
  const data = await teacherPortalService.getClasses(req.user!.id);
  res.json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  });
});

export const getClassStudents = asyncHandler(async (req: Request, res: Response) => {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const month = (req.query.month as string) || defaultMonth;
  const data = await teacherPortalService.getClassStudents(
    req.user!.id,
    req.params.classId,
    month
  );
  res.json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  });
});

export const setStudentMonthlyFee = asyncHandler(async (req: Request, res: Response) => {
  const data = await teacherPortalService.setStudentMonthlyFee(
    req.user!.id,
    req.params.classId,
    req.params.studentId,
    req.body
  );
  res.json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  });
});

export const setStudentsMonthlyFeeBulk = asyncHandler(async (req: Request, res: Response) => {
  const data = await teacherPortalService.setStudentsMonthlyFeeBulk(
    req.user!.id,
    req.params.classId,
    req.body
  );
  res.json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  });
});

export const getStudentMonthlySessions = asyncHandler(async (req: Request, res: Response) => {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const month = (req.query.month as string) || defaultMonth;
  const data = await teacherPortalService.getStudentMonthlySessions(
    req.user!.id,
    req.params.classId,
    req.params.studentId,
    month
  );
  res.json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  });
});

export const exportStudentReceipt = asyncHandler(async (req: Request, res: Response) => {
  const data = await teacherPortalService.exportStudentReceipt(
    req.user!.id,
    req.params.classId,
    req.params.studentId,
    req.body.month
  );
  res.json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  });
});

export const sendStudentReceipt = asyncHandler(async (req: Request, res: Response) => {
  const data = await teacherPortalService.sendStudentReceipt(
    req.user!.id,
    req.params.classId,
    req.params.studentId,
    req.body.month
  );
  res.json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  });
});

export const sendClassReceiptsBulk = asyncHandler(async (req: Request, res: Response) => {
  const data = await teacherPortalService.sendClassReceiptsBulk(
    req.user!.id,
    req.params.classId,
    req.body.month
  );
  res.json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  });
});

export const confirmStudentPayment = asyncHandler(async (req: Request, res: Response) => {
  const data = await teacherPortalService.confirmStudentPayment(
    req.user!.id,
    req.params.classId,
    req.params.studentId,
    req.body.month
  );
  res.json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  });
});

export const getPaymentSettings = asyncHandler(async (req: Request, res: Response) => {
  const data = await teacherPortalService.getPaymentSettings(req.user!.id);
  res.json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  });
});

export const updatePaymentSettings = asyncHandler(async (req: Request, res: Response) => {
  const data = await teacherPortalService.updatePaymentSettings(req.user!.id, req.body);
  res.json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  });
});
