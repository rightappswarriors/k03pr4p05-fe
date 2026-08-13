import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useAuth } from './AuthContext';

type SocketEvent = { event?: string; type?: string; payload?: any };
type Listener = (event: SocketEvent) => void;
type SocketValue = { connected: boolean; send: (event: string, payload?: unknown) => void; subscribe: (listener: Listener) => () => void };
const SocketContext = createContext<SocketValue | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user, accessToken } = useAuth();
  const socket = useRef<WebSocket | null>(null);
  const listeners = useRef(new Set<Listener>());
  const retry = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track conversation rooms so they can be re-joined after reconnect (FIX #4)
  const joinedConversations = useRef(new Set<string>());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user || !accessToken) return;
    const rawUrl =
      Platform.OS === 'web'
        ? process.env.EXPO_PUBLIC_WS_URL
        : process.env.EXPO_PUBLIC_WS_URL_ANDROID_EMULATOR || process.env.EXPO_PUBLIC_WS_URL;
    if (!rawUrl) return;

    let active = true;

    const connect = () => {
      const url = `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(accessToken)}`;
      const ws = new WebSocket(url);
      socket.current = ws;

      ws.onopen = () => {
        if (!active) return;
        setConnected(true);
        // Re-join all conversation rooms that were previously joined (FIX #4)
        joinedConversations.current.forEach((convId) => {
          socket.current?.send(JSON.stringify({ event: 'conversation:join', conversationId: convId }));
        });
      };

      ws.onmessage = ({ data }) => {
        try {
          const event = JSON.parse(data) as SocketEvent;
          listeners.current.forEach((listener) => listener(event));
        } catch {}
      };

      ws.onclose = () => {
        if (!active) return;
        setConnected(false);
        joinedConversations.current.clear();
        retry.current = setTimeout(connect, 1000);
      };
    };

    connect();

    return () => {
      active = false;
      if (retry.current) clearTimeout(retry.current);
      socket.current?.close();
    };
  }, [user, accessToken]);

  const send = useCallback((event: string, payload?: unknown) => {
    if (socket.current?.readyState === WebSocket.OPEN) {
      if (payload && typeof payload === 'object') {
        socket.current.send(JSON.stringify({ event, ...payload }));
      } else {
        socket.current.send(JSON.stringify({ event }));
      }
    }
    // Track conversation room joins/leaves for reconnect recovery (FIX #4)
    if (event === 'conversation:join' && payload && typeof payload === 'object' && 'conversationId' in payload) {
      joinedConversations.current.add(String((payload as any).conversationId));
    }
    if (event === 'conversation:leave' && payload && typeof payload === 'object' && 'conversationId' in payload) {
      joinedConversations.current.delete(String((payload as any).conversationId));
    }
  }, []);

  const subscribe = useCallback(
    (listener: Listener) => {
      listeners.current.add(listener);
      return () => listeners.current.delete(listener);
    },
    []
  );

  return <SocketContext.Provider value={{ connected, send, subscribe }}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const value = useContext(SocketContext);
  if (!value) throw new Error('useSocket must be used within SocketProvider');
  return value;
}
