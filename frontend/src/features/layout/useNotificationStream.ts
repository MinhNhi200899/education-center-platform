import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '@/lib/api';
import { getAccessToken } from '@/lib/token-storage';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

type NotificationsCache = {
  unreadCount: number;
  items: NotificationItem[];
};

/**
 * Keep one SSE connection open while logged in.
 * New notifications are pushed into the React Query cache (no polling).
 */
export function useNotificationStream(enabled: boolean) {
  const queryClient = useQueryClient();
  const retryRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    let closed = false;
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const clearReconnect = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const connect = () => {
      if (closed) return;
      const token = getAccessToken();
      if (!token) return;

      es?.close();
      const url = `${API_BASE_URL}/notifications/stream?access_token=${encodeURIComponent(token)}`;
      es = new EventSource(url);

      es.addEventListener('connected', () => {
        retryRef.current = 0;
      });

      es.addEventListener('notification', (event) => {
        try {
          const item = JSON.parse((event as MessageEvent).data) as NotificationItem;
          queryClient.setQueryData<NotificationsCache>(['notifications'], (prev) => {
            if (!prev) {
              return { unreadCount: item.isRead ? 0 : 1, items: [item] };
            }
            if (prev.items.some((n) => n.id === item.id)) return prev;
            return {
              unreadCount: prev.unreadCount + (item.isRead ? 0 : 1),
              items: [item, ...prev.items].slice(0, 40),
            };
          });
        } catch {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      });

      es.onerror = () => {
        es?.close();
        es = null;
        if (closed) return;
        const delay = Math.min(30_000, 1000 * 2 ** retryRef.current);
        retryRef.current += 1;
        clearReconnect();
        reconnectTimer = setTimeout(connect, delay);
      };
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !es && !closed) {
        retryRef.current = 0;
        connect();
      }
    };

    connect();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      closed = true;
      clearReconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      es?.close();
    };
  }, [enabled, queryClient]);
}
