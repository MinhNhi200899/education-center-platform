import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/async-handler';
import { evaluationService } from './services/evaluation.service';
import { evaluationZaloService } from './services/zalo.service';

function getCenterId(req: Request): string | undefined {
  return req.user?.centerId ?? undefined;
}

function getUserId(req: Request): string | undefined {
  return req.user?.id;
}

export const listEvaluations = asyncHandler(async (req: Request, res: Response) => {
  const centerId = getCenterId(req);
  const result = await evaluationService.list({
    centerId,
    classId: req.query.classId as string | undefined,
    studentId: req.query.studentId as string | undefined,
    teacherId: req.query.teacherId as string | undefined,
    evaluationType: req.query.evaluationType as any,
    month: req.query.month ? Number(req.query.month) : undefined,
    year: req.query.year ? Number(req.query.year) : undefined,
    startDate: req.query.startDate as string | undefined,
    endDate: req.query.endDate as string | undefined,
    page: req.query.page ? Number(req.query.page) : 1,
    limit: req.query.limit ? Number(req.query.limit) : 20,
  });

  res.json({
    success: true,
    data: result.data,
    meta: { ...result.meta, timestamp: new Date().toISOString() },
  });
});

export const getEvaluation = asyncHandler(async (req: Request, res: Response) => {
  const data = await evaluationService.getById(req.params.id, getCenterId(req));
  res.json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  });
});

export const createEvaluation = asyncHandler(async (req: Request, res: Response) => {
  const data = await evaluationService.create(req.body, getUserId(req), getCenterId(req));
  res.status(201).json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  });
});

export const updateEvaluation = asyncHandler(async (req: Request, res: Response) => {
  const data = await evaluationService.update(req.params.id, req.body, getCenterId(req));
  res.json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  });
});

export const deleteEvaluation = asyncHandler(async (req: Request, res: Response) => {
  await evaluationService.delete(req.params.id, getCenterId(req));
  res.json({
    success: true,
    data: { deleted: true },
    meta: { timestamp: new Date().toISOString() },
  });
});

export const bulkCreateEvaluations = asyncHandler(async (req: Request, res: Response) => {
  const result = await evaluationService.bulkCreate(
    req.body,
    getUserId(req),
    getCenterId(req)
  );
  res.status(201).json({
    success: true,
    data: result,
    meta: { timestamp: new Date().toISOString() },
  });
});

export const previewEvaluationReport = asyncHandler(async (req: Request, res: Response) => {
  const format = (req.query.format as string) || 'json';
  const result = await evaluationService.previewReport(req.params.id, getCenterId(req));

  if (format === 'html') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(result.html);
    return;
  }

  res.json({
    success: true,
    data: result,
    meta: { timestamp: new Date().toISOString() },
  });
});

export const shareEvaluationZalo = asyncHandler(async (req: Request, res: Response) => {
  const evaluation = await evaluationService.getById(req.params.id, getCenterId(req));
  const result = await evaluationZaloService.shareEvaluation(evaluation, getUserId(req));
  res.json({
    success: true,
    data: result,
    meta: { timestamp: new Date().toISOString() },
  });
});
