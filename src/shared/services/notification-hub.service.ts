import type { Response } from 'express';
import { logger } from './logger.service';

export type NotificationSsePayload = {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: unknown;
  isRead: boolean;
  createdAt: string;
};

type Client = {
  userId: string;
  res: Response;
  heartbeat: NodeJS.Timeout;
};

/**
 * In-memory SSE hub (single Node process).
 * Fine for one Render web service; use Redis pub/sub if scaled horizontally later.
 */
class NotificationHub {
  private clients = new Map<string, Set<Client>>();

  subscribe(userId: string, res: Response): () => void {
    const client: Client = {
      userId,
      res,
      heartbeat: setInterval(() => {
        this.write(res, 'ping', { t: Date.now() });
      }, 25_000),
    };

    let set = this.clients.get(userId);
    if (!set) {
      set = new Set();
      this.clients.set(userId, set);
    }
    set.add(client);

    logger.info('SSE notification client connected', {
      userId,
      connections: set.size,
    });

    return () => {
      clearInterval(client.heartbeat);
      const current = this.clients.get(userId);
      if (!current) return;
      current.delete(client);
      if (current.size === 0) this.clients.delete(userId);
      logger.info('SSE notification client disconnected', {
        userId,
        connections: current.size,
      });
    };
  }

  publish(userId: string, notification: NotificationSsePayload): void {
    const set = this.clients.get(userId);
    if (!set || set.size === 0) return;

    for (const client of set) {
      this.write(client.res, 'notification', notification);
    }
  }

  private write(res: Response, event: string, data: unknown): void {
    if (res.writableEnded) return;
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      logger.warn('SSE write failed', { error });
    }
  }
}

export const notificationHub = new NotificationHub();
