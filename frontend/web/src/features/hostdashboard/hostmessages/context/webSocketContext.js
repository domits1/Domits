// /Users/mh/Domits/frontend/web/src/features/hostdashboard/hostmessages/context/webSocketContext.js
import { createContext, useEffect, useMemo, useRef, useState } from "react";
import { connectWebSocket, sendMessage, disconnectWebSocket } from "../services/websocket";

export const WebSocketContext = createContext();

const toIso = (v) => {
  if (!v) return new Date().toISOString();
  if (typeof v === "number") return new Date(v).toISOString();
  const d = new Date(v);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

const normalizeIncoming = (raw) => {
  if (!raw) return null;

  // unwrap { action:"messageSent", message:{...} } and similar envelopes
  const msg = raw?.message && typeof raw.message === "object" ? raw.message : raw;

  const senderId = msg?.userId || msg?.senderId || null;
  const recipientId = msg?.recipientId || null;

  // ignore non-message events (ping/connected/etc)
  if (!senderId || !recipientId) return null;

  const text = msg?.text ?? msg?.content ?? "";
  const content = msg?.content ?? msg?.text ?? "";
  const createdAt = toIso(msg?.createdAt);

  const fileUrls = Array.isArray(msg?.fileUrls)
    ? msg.fileUrls
    : Array.isArray(msg?.attachments)
    ? msg.attachments.map((a) => a?.url).filter(Boolean)
    : (() => {
        const at = msg?.attachments;
        if (!at) return [];
        if (typeof at === "string") {
          try {
            const parsed = JSON.parse(at);
            return Array.isArray(parsed) ? parsed.map((x) => x?.url).filter(Boolean) : [];
          } catch {
            return [];
          }
        }
        return [];
      })();

  // ensure we ALWAYS have an id for dedupe
  const id =
    msg?.id ||
    `${senderId}:${recipientId}:${createdAt}:${String(text).slice(0, 40)}:${fileUrls.length}`;

  return {
    ...msg,
    id,
    userId: senderId, // IMPORTANT: ChatScreen expects msg.userId as sender
    senderId: msg?.senderId || senderId,
    recipientId,
    text,
    content,
    createdAt,
    fileUrls,
  };
};

export const WebSocketProvider = ({ userId, children }) => {
  const [messages, setMessages] = useState([]);
  const seenRef = useRef(new Set());

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = connectWebSocket(userId, (incoming) => {
      const normalized = normalizeIncoming(incoming);

      try {
        window.__domitsWsLast = incoming;
        window.__domitsWsLastNormalized = normalized;
      } catch {}

      if (!normalized) return;

      const key = normalized.id;
      if (key && seenRef.current.has(key)) return;
      if (key) seenRef.current.add(key);

      setMessages((prev) => [...prev, normalized]);
    });

    return () => {
      try {
        unsubscribe?.();
      } catch {}
      disconnectWebSocket();
      seenRef.current.clear();
      setMessages([]);
    };
  }, [userId]);

  const value = useMemo(() => ({ messages, sendMessage }), [messages]);

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};