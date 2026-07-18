import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/async-handler';
import { prisma } from '../../config/database';
import { NotFoundException } from '../../shared/types/error.types';

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
      items: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        data: n.data,
        isRead: n.isRead,
        createdAt: n.createdAt,
      })),
    },
    meta: { timestamp: new Date().toISOString() },
  });
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
