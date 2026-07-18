import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import {
  notificationHub,
  type NotificationSsePayload,
} from '../../shared/services/notification-hub.service';

export type CreateNotificationInput = {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Prisma.InputJsonValue;
};

function toSsePayload(n: {
  id: string;
  type: string;
  title: string;
  message: string;
  data: unknown;
  isRead: boolean;
  createdAt: Date;
}): NotificationSsePayload {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    data: n.data,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  };
}

/** Persist notification and push to any open SSE subscribers for that user. */
export async function createNotification(input: CreateNotificationInput) {
  const created = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      data: input.data ?? undefined,
    },
  });

  notificationHub.publish(input.userId, toSsePayload(created));
  return created;
}

export function mapNotificationForClient(n: {
  id: string;
  type: string;
  title: string;
  message: string;
  data: unknown;
  isRead: boolean;
  createdAt: Date;
}): NotificationSsePayload {
  return toSsePayload(n);
}
