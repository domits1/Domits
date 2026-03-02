import { createContext, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { connectWebSocket, sendMessage, disconnectWebSocket } from "../services/websocket";

export const WebSocketContext = createContext();

const toIso = (v) => {
  if (!v) return new Date().toISOString();
  if (typeof v === "number") return new Date(v).toISOString();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

const normalizeIncoming = (raw) => {
  if (!raw) return null;

  const msg = raw?.message && typeof raw.message === "object" ? raw.message : raw;

  const senderId = msg?.userId || msg?.senderId || null;
  const recipientId = msg?.recipientId || null;

  if (!senderId || !recipientId) return null;

  const text = msg?.text ?? msg?.content ?? "";
  const content = msg?.content ?? msg?.text ?? "";
  const createdAt = toIso(msg?.createdAt);

  const extractFileUrls = (attachments) => {
    if (!attachments) return [];
    if (Array.isArray(attachments)) return attachments.map((a) => a?.url).filter(Boolean);
    if (typeof attachments === "string") {
      try {
        const parsed = JSON.parse(attachments);
        return Array.isArray(parsed) ? parsed.map((x) => x?.url).filter(Boolean) : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const fileUrls = Array.isArray(msg?.fileUrls) ? msg.fileUrls : extractFileUrls(msg?.attachments);

  const id =
    msg?.id ||
    `${senderId}:${recipientId}:${createdAt}:${String(text).slice(0, 40)}:${fileUrls.length}`;

  return {
    ...msg,
    id,
    userId: senderId,
    senderId: msg?.senderId || senderId,
    recipientId,
    text,
    content,
    createdAt,
    fileUrls,
  };
};

export const WebSocketProvider = ({ userId, children, token }) => {
  const [messages, setMessages] = useState([]);
  const seenRef = useRef(new Set());

  useEffect(() => {
    if (!userId && !token) return;

    connectWebSocket(
      userId,
      (incoming) => {
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

        try {
          window.dispatchEvent(new CustomEvent("domits:ws-message", { detail: normalized }));
        } catch {}
      },
      token
    );

    return () => {
      disconnectWebSocket();
      seenRef.current.clear();
      setMessages([]);
    };
  }, [userId, token]);

  const value = useMemo(() => ({ messages, sendMessage }), [messages]);

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};

WebSocketProvider.propTypes = {
  userId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  token: PropTypes.string,
  children: PropTypes.node,
};
