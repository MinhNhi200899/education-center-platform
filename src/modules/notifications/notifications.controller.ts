import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/async-handler';
import { prisma } from '../../config/database';
import { NotFoundException } from '../../shared/types/error.types';
import { notificationHub } from '../../shared/services/notification-hub.service';
import { mapNotificationForClient } from './create-notification';

export const listMyNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 40,
  });

  res.json({
    success: true,
    data: {
      unreadCount: notifications.filter((n) => !n.isRead).length,
      items: notifications.map((n) => mapNotificationForClient(n)),
    },
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * SSE stream — client connects once; server pushes `notification` events.
 * Auth via Bearer header or `?access_token=` (EventSource).
 */
export const streamNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  req.socket.setTimeout(0);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  res.write(`event: connected\ndata: ${JSON.stringify({ userId, t: Date.now() })}\n\n`);

  const unsubscribe = notificationHub.subscribe(userId, res);

  const onClose = () => {
    unsubscribe();
  };

  req.on('close', onClose);
  req.on('aborted', onClose);
});

export const markNotificationRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const notification = await prisma.notification.findFirst({
    where: { id: req.params.id, userId },
  });
  if (!notification) throw new NotFoundException('Notification');

  if (!notification.isRead) {
    await prisma.notification.update({
      where: { id: notification.id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  res.json({
    success: true,
    data: { id: notification.id, isRead: true },
    meta: { timestamp: new Date().toISOString() },
  });
});

export const markAllNotificationsRead = asyncHandler(async (req: Request, res: Response) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });

  res.json({
    success: true,
    data: { success: true },
    meta: { timestamp: new Date().toISOString() },
  });
});
