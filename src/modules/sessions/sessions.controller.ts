import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/async-handler';
import { sessionService } from './services/session.service';
import { assertCenterAccess } from '../../shared/utils/center-scope';
import { prisma } from '../../config/database';

export const createSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const session = await sessionService.create(req.user!.id, req.body);
  res.status(201).json({
    success: true,
    data: session,
    meta: { timestamp: new Date().toISOString() },
  });
});

async function assertSessionCenterAccess(req: Request, sessionId: string): Promise<void> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { class: { select: { centerId: true } } },
  });
  if (!session) {
    return;
  }
  assertCenterAccess(req, session.class.centerId);
}

export const getSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await assertSessionCenterAccess(req, req.params.id);
  const session = await sessionService.getById(req.params.id);
  res.json({
    success: true,
    data: session,
    meta: { timestamp: new Date().toISOString() },
  });
});

export const updateSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await assertSessionCenterAccess(req, req.params.id);
  const session = await sessionService.update(req.params.id, req.user!.id, req.body);
  res.json({
    success: true,
    data: session,
    meta: { timestamp: new Date().toISOString() },
  });
});

export const deleteSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await assertSessionCenterAccess(req, req.params.id);
  const result = await sessionService.delete(req.params.id, req.user!.id);
  res.json({
    success: true,
    data: result,
    meta: { timestamp: new Date().toISOString() },
  });
});

export const addSessionMaterial = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await assertSessionCenterAccess(req, req.params.id);
  const userId = req.user!.id;
  const material = await sessionService.addMaterial(req.params.id, userId, req.body);
  res.status(201).json({
    success: true,
    data: material,
    meta: { timestamp: new Date().toISOString() },
  });
});

export const listHomeworkSubmissions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await assertSessionCenterAccess(req, req.params.id);
  const data = await sessionService.listHomeworkSubmissions(req.params.id, req.user!.id);
  res.json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  });
});

export const setHomeworkFeedback = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await assertSessionCenterAccess(req, req.params.sessionId);
  const data = await sessionService.setHomeworkFeedback(
    req.params.sessionId,
    req.params.studentId,
    req.user!.id,
    req.body.feedback
  );
  res.json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  });
});
