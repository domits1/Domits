import { createContext, useEffect, useMemo, useRef, useState } from "react";
import { sendMessage } from "../services/websocket"; // KEEP your existing sender
import { connectWebSocketRealtime, disconnectWebSocketRealtime } from "../services/websocketRealtime";

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

const getTokenSomehow = () => {
  // try common keys used in apps
  const candidates = [
    "accessToken",
    "token",
    "jwt",
    "idToken",
    "authToken",
    "Authorization",
  ];

  for (const k of candidates) {
    const v = window?.localStorage?.getItem(k);
    if (v && typeof v === "string") {
      // allow either "Bearer xxx" or raw jwt
      return v.startsWith("Bearer ") ? v.slice("Bearer ".length) : v;
    }
  }

  // sometimes apps store a JSON object
  const jsonKeys = ["user", "session", "auth"];
  for (const k of jsonKeys) {
    const raw = window?.localStorage?.getItem(k);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      const maybe =
        parsed?.accessToken ||
        parsed?.token ||
        parsed?.jwt ||
        parsed?.idToken ||
        parsed?.session?.accessToken;
      if (maybe) return String(maybe).startsWith("Bearer ") ? String(maybe).slice(7) : String(maybe);
    } catch {}
  }

  return null;
};

export const WebSocketProvider = ({ userId, children }) => {
  const [messages, setMessages] = useState([]);
  const seenRef = useRef(new Set());

  useEffect(() => {
    if (!userId) return;

    const token = getTokenSomehow();

    connectWebSocketRealtime({
      userId,
      token,
      onMessage: (incoming) => {
        const normalized = normalizeIncoming(incoming);

        // debug hook (optional)
        try {
          window.__domitsWsLast = incoming;
          window.__domitsWsLastNormalized = normalized;
        } catch {}

        if (!normalized) return;

        const key = normalized.id;
        if (key && seenRef.current.has(key)) return;
        if (key) seenRef.current.add(key);

        setMessages((prev) => [...prev, normalized]);
      },
      onStatus: (s) => {
        // optional debug
        try {
          window.__domitsWsStatus = s;
        } catch {}
      },
    });

    return () => {
      disconnectWebSocketRealtime();
      seenRef.current.clear();
      setMessages([]);
    };
  }, [userId]);

  const value = useMemo(() => ({ messages, sendMessage }), [messages]);

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};
