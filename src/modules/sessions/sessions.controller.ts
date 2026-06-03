import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/async-handler';
import { sessionService } from './services/session.service';

export const getSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const session = await sessionService.getById(req.params.id);
  res.json({
    success: true,
    data: session,
    meta: { timestamp: new Date().toISOString() },
  });
});

export const updateSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const session = await sessionService.update(req.params.id, req.body);
  res.json({
    success: true,
    data: session,
    meta: { timestamp: new Date().toISOString() },
  });
});

export const addSessionMaterial = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const material = await sessionService.addMaterial(req.params.id, userId, req.body);
  res.status(201).json({
    success: true,
    data: material,
    meta: { timestamp: new Date().toISOString() },
  });
});
