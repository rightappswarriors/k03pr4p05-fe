import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { getNotificationUnreadCount, type NotificationAccountContext, type NotificationCategory, type NotificationItem } from '@/services/notificationService';

export type RealtimeNotification = NotificationItem & { deepLink?: string; organizationId?: number; purchaseOrderId?: string };
type Value = {
  notifications: RealtimeNotification[];
  latestNotification: RealtimeNotification | null;
  unreadCount: number;
  activeContext: NotificationAccountContext | null;
  activate: (accountContext: NotificationAccountContext) => void;
  refreshUnread: () => Promise<void>;
  setCanonicalUnreadCount: (count: number) => void;
  markRead: (id: RealtimeNotification['id']) => void;
  markAllRead: () => void;
  markReadLocal: (id: RealtimeNotification['id']) => void;
  markAllReadLocal: () => void;
};
const NotificationContext = createContext<Value | undefined>(undefined);
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { connected, subscribe } = useSocket();
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [latestNotification, setLatestNotification] = useState<RealtimeNotification | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeContext, setActiveContext] = useState<NotificationAccountContext | null>(null);
  const activeContextRef = useRef<NotificationAccountContext | null>(null);
  const seenIds = useRef(new Set<number>());

  const activate = useCallback((accountContext: NotificationAccountContext) => {
    activeContextRef.current = accountContext;
    setActiveContext((current) => current === accountContext ? current : accountContext);
  }, []);

  const refreshUnread = useCallback(async () => {
    const accountContext = activeContextRef.current;
    if (!user || !accountContext) return;
    try {
      setUnreadCount(await getNotificationUnreadCount(accountContext));
    } catch {
      // The full notification screen owns visible retry/error UI. The shell badge stays non-blocking.
    }
  }, [user]);

  const markReadLocal = useCallback((id: RealtimeNotification['id']) => {
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, isRead: true } : item));
    setLatestNotification((current) => current?.id === id ? { ...current, isRead: true } : current);
    setUnreadCount((current) => Math.max(0, current - 1));
  }, []);

  const markAllReadLocal = useCallback(() => {
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    setLatestNotification((current) => current ? { ...current, isRead: true } : current);
    setUnreadCount(0);
  }, []);

  useEffect(() => subscribe(({ event, type, payload }) => {
    const accountContext = activeContextRef.current;
    if (event === 'notification:new' || type === 'NOTIFICATION') {
      if (!accountContext || !payload) return;
      if (accountContext === 'ADMIN' && payload.recipientAudience !== 'PLATFORM_ADMIN') return;
      if (accountContext !== 'ADMIN' && payload.recipientAudience === 'PLATFORM_ADMIN') return;
      const id = Number(payload.id);
      if (!Number.isSafeInteger(id) || seenIds.current.has(id)) return;
      seenIds.current.add(id);
      const category: NotificationCategory = payload.category ?? 'SYSTEM';
      const notification: RealtimeNotification = {
        ...payload,
        id,
        category,
        title: String(payload.title ?? 'Notification'),
        message: String(payload.message ?? ''),
        type: String(payload.type ?? 'NEW_TRANSACTION'),
        createdAt: new Date(payload.createdAt ?? Date.now()).toISOString(),
        isRead: Boolean(payload.isRead),
      };
      setLatestNotification(notification);
      setNotifications((current) => [notification, ...current.filter((item) => item.id !== id)].slice(0, 50));
      if (!notification.isRead) setUnreadCount((current) => current + 1);
    }
    if (event === 'notification:read') {
      if (payload?.all) markAllReadLocal();
      else if (Number.isSafeInteger(Number(payload?.id))) {
        const id = Number(payload.id);
        setNotifications((current) => current.map((item) => item.id === id ? { ...item, isRead: true } : item));
        setLatestNotification((current) => current?.id === id ? { ...current, isRead: true } : current);
        void refreshUnread();
      } else void refreshUnread();
    }
  }), [markAllReadLocal, refreshUnread, subscribe]);

  useEffect(() => {
    if (!user) {
      activeContextRef.current = null;
      seenIds.current.clear();
      setActiveContext(null);
      setNotifications([]);
      setLatestNotification(null);
      setUnreadCount(0);
      return;
    }
    if (activeContext) void refreshUnread();
  }, [activeContext, connected, refreshUnread, user]);

  const setCanonicalUnreadCount = useCallback((count: number) => setUnreadCount(Math.max(0, count)), []);
  const value = useMemo(() => ({
    notifications,
    latestNotification,
    unreadCount,
    activeContext,
    activate,
    refreshUnread,
    setCanonicalUnreadCount,
    markRead: markReadLocal,
    markAllRead: markAllReadLocal,
    markReadLocal,
    markAllReadLocal,
  }), [activeContext, activate, latestNotification, markAllReadLocal, markReadLocal, notifications, refreshUnread, setCanonicalUnreadCount, unreadCount]);
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
export function useNotifications() { const value = useContext(NotificationContext); if (!value) throw new Error('useNotifications must be used within NotificationProvider'); return value; }
