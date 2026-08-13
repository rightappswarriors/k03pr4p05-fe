import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useSocket } from './SocketContext';

export type RealtimeNotification = { id: string | number; title: string; message: string; type: string; createdAt: string; isRead: boolean; deepLink?: string; organizationId?: number; conversationId?: string; purchaseOrderId?: string };
type Value = { notifications: RealtimeNotification[]; unreadCount: number; markRead: (id: RealtimeNotification['id']) => void; markAllRead: () => void };
const NotificationContext = createContext<Value | undefined>(undefined);
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { subscribe } = useSocket(); const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  useEffect(() => subscribe(({ event, type, payload }) => {
    if (event === 'notification:new' || type === 'NOTIFICATION') setNotifications((current) => [ { ...payload, id: payload.id ?? `${Date.now()}`, createdAt: payload.createdAt ?? new Date().toISOString(), isRead: payload.isRead ?? false }, ...current.filter((n) => n.id !== payload.id) ]);
    if (event === 'notification:read') setNotifications((current) => current.map((n) => ({ ...n, isRead: true })));
  }), [subscribe]);
  const value = useMemo(() => ({ notifications, unreadCount: notifications.filter((n) => !n.isRead).length, markRead: (id: RealtimeNotification['id']) => setNotifications((xs) => xs.map((n) => n.id === id ? { ...n, isRead: true } : n)), markAllRead: () => setNotifications((xs) => xs.map((n) => ({ ...n, isRead: true }))) }), [notifications]);
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
export function useNotifications() { const value = useContext(NotificationContext); if (!value) throw new Error('useNotifications must be used within NotificationProvider'); return value; }
