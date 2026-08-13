import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSocket } from './SocketContext';

type Value = { events: Record<string, any[]>; join: (conversationId: string) => void; leave: (conversationId: string) => void; typing: (conversationId: string, active: boolean) => void };
const ConversationContext = createContext<Value | undefined>(undefined);

export function ConversationProvider({ children }: { children: React.ReactNode }) {
  const { send, subscribe } = useSocket();
  const [events, setEvents] = useState<Record<string, any[]>>({});

  // Single listener — registered once on mount, cleaned up on unmount.
  // The subscribe callback is stable (useCallback in SocketContext) so this
  // effect runs exactly once across the component's lifetime.
  useEffect(() => {
    return subscribe(({ event, type, payload }) => {
      const name = event || type;
      if (!name?.startsWith('conversation:') && !name?.startsWith('offer:') && !name?.startsWith('purchaseOrder:')) return;
      const id = payload?.conversationId;
      if (!id) return;

      // Deduplicate by clientMessageId (optimistic replacement) or server-generated id
      const clientMsgId = payload?.clientMessageId;
      const msgId = payload?.id || payload?.offerId;

      setEvents((old) => {
        const arr = old[id] ?? [];
        if (clientMsgId && arr.some((e) => e.payload?.clientMessageId === clientMsgId)) {
          if (__DEV__) console.log(`[ConversationContext] REPLACE ${name} clientMessageId=${clientMsgId}`);
          return { ...old, [id]: arr.map((e) => (e.payload?.clientMessageId === clientMsgId ? { event: name, payload } : e)) };
        }
        if (msgId && arr.some((e) => (e.payload?.id || e.payload?.offerId) === msgId)) {
          if (__DEV__) console.log(`[ConversationContext] IGNORE duplicate ${name}`);
          return old;
        }
        if (__DEV__) console.log(`[ConversationContext] APPENDED ${name} conversation:${id} (total: ${arr.length + 1})`);
        return { ...old, [id]: [...arr, { event: name, payload }] };
      });
    });
  }, [subscribe]);

  // Stable join/leave/typing — depend only on send (stable from SocketContext).
  // Prevents consumers' useEffect from re-running on every provider re-render.
  const join = useCallback((conversationId: string) => send('conversation:join', { conversationId }), [send]);
  const leave = useCallback((conversationId: string) => send('conversation:leave', { conversationId }), [send]);
  const typing = useCallback(
    (conversationId: string, active: boolean) => send(active ? 'typing:start' : 'typing:stop', { conversationId }),
    [send]
  );

  const value = useMemo(() => ({ events, join, leave, typing }), [events, join, leave, typing]);

  return <ConversationContext.Provider value={value}>{children}</ConversationContext.Provider>;
}

export function useConversation() {
  const value = useContext(ConversationContext);
  if (!value) throw new Error('useConversation must be used within ConversationProvider');
  return value;
}
