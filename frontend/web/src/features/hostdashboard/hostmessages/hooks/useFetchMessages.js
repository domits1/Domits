import { useState, useCallback, useRef, useEffect, useContext } from "react";
import { WebSocketContext } from "../context/webSocketContext";

const UNIFIED_API = "https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default";

const toIso = (v) => {
  if (!v) return new Date().toISOString();
  if (typeof v === "number") return new Date(v).toISOString();
  const d = new Date(v);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

const safeJsonParse = (v) => {
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
};

const normalizeMetadata = (metadata) => {
  if (!metadata) return {};
  if (typeof metadata === "string") return safeJsonParse(metadata) || {};
  return metadata;
};

const extractFileUrlsFromAttachments = (attachments) => {
  if (!attachments) return [];
  if (Array.isArray(attachments)) return attachments.map((x) => x?.url).filter(Boolean);

  if (typeof attachments === "string") {
    const parsed = safeJsonParse(attachments);
    if (Array.isArray(parsed)) return parsed.map((x) => x?.url).filter(Boolean);
    return [];
  }

  return [];
};

const normalizeWs = (raw) => {
  if (!raw || typeof raw !== "object") return null;

  const msg = raw?.message && typeof raw.message === "object" ? raw.message : raw;

  const type = msg?.type || raw?.type;
  if (type && type !== "message") {
    const hasIds = !!(msg?.senderId || msg?.userId) && !!msg?.recipientId;
    if (!hasIds) return null;
  }

  const senderId = msg?.senderId || msg?.userId || null;
  const recipientId = msg?.recipientId || null;
  if (!senderId || !recipientId) return null;

  const text = msg?.text ?? msg?.content ?? "";
  const content = msg?.content ?? msg?.text ?? "";

  const fileUrls = Array.isArray(msg?.fileUrls) ? msg.fileUrls : extractFileUrlsFromAttachments(msg?.attachments);
  const createdAt = toIso(msg?.createdAt);

  const id = msg?.id || `${senderId}:${recipientId}:${createdAt}:${String(text).slice(0, 40)}:${fileUrls.length}`;

  const metadata = normalizeMetadata(msg?.metadata);

  return {
    ...msg,
    id,
    threadId: msg?.threadId || null,
    senderId: msg?.senderId || senderId,
    recipientId,
    userId: senderId,
    text,
    content,
    createdAt,
    fileUrls,
    metadata,
  };
};

const resolveThreadIdForPartner = async (userId, partnerId) => {
  if (!userId || !partnerId) return null;

  try {
    const res = await fetch(`${UNIFIED_API}/threads?userId=${encodeURIComponent(userId)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) return null;

    const data = await res.json().catch(() => null);
    const threads = Array.isArray(data) ? data : [];

    const u = String(userId);
    const p = String(partnerId);

    const candidates = threads.filter((t) => {
      const a = String(t?.hostId || "");
      const b = String(t?.guestId || "");
      return (a === u && b === p) || (a === p && b === u);
    });

    if (!candidates.length) return null;

    const score = (t) => Number(t?.lastMessageAt || 0) || Number(t?.updatedAt || 0) || Number(t?.createdAt || 0) || 0;

    candidates.sort((x, y) => score(y) - score(x));
    return candidates[0]?.id || null;
  } catch {
    return null;
  }
};

const transformApiMessage = (msg, selfUserId, threadIdFallback) => {
  const metadata = normalizeMetadata(msg?.metadata);

  return {
    ...msg,
    threadId: msg?.threadId || threadIdFallback || null,
    userId: msg?.senderId,
    senderId: msg?.senderId,
    recipientId: msg?.recipientId,
    text: msg?.content || msg?.text || "",
    content: msg?.content || msg?.text || "",
    isAutomated: metadata?.isAutomated || false,
    messageType: metadata?.messageType || null,
    isSent: metadata?.isAutomated ? false : msg?.senderId === selfUserId,
    createdAt: toIso(msg?.createdAt),
    fileUrls: extractFileUrlsFromAttachments(msg?.attachments),
    metadata,
  };
};

export const useFetchMessages = (userId) => {
  const wsCtx = useContext(WebSocketContext);
  const wsMessages = wsCtx?.messages || [];

  const [messagesByRecipient, setMessagesByRecipient] = useState({});
  const [messagesByThread, setMessagesByThread] = useState({});
  const cacheRef = useRef({});
  const wsSeenRef = useRef(new Set());

  const [activeRecipientId, setActiveRecipientId] = useState(null);
  const [activeThreadId, setActiveThreadId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const upsertIntoStores = useCallback(
    (newMessage) => {
      if (!newMessage || !newMessage.id) return;

      const partnerId = newMessage.userId === userId ? newMessage.recipientId : newMessage.userId;
      if (!partnerId) return;

      const threadKey = newMessage.threadId || null;

      setMessagesByRecipient((prev) => {
        const current = prev[partnerId] || [];
        if (current.some((m) => m.id === newMessage.id)) return prev;

        const nextForPartner = [...current, newMessage].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        const next = { ...prev, [partnerId]: nextForPartner };
        cacheRef.current[partnerId] = nextForPartner;
        return next;
      });

      if (threadKey) {
        setMessagesByThread((prev) => {
          const current = prev[threadKey] || [];
          if (current.some((m) => m.id === newMessage.id)) return prev;

          const nextForThread = [...current, newMessage].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          const next = { ...prev, [threadKey]: nextForThread };
          cacheRef.current[threadKey] = nextForThread;
          return next;
        });
      }
    },
    [userId]
  );

  useEffect(() => {
    if (!Array.isArray(wsMessages) || wsMessages.length === 0) return;

    for (const raw of wsMessages) {
      const normalized = normalizeWs(raw);
      if (!normalized) continue;

      const key = normalized.id;
      if (wsSeenRef.current.has(key)) continue;
      wsSeenRef.current.add(key);

      upsertIntoStores(normalized);
    }
  }, [wsMessages, upsertIntoStores]);

  const fetchMessages = useCallback(
    async (recipientId, threadId = null) => {
      if (!recipientId) {
        console.error("Recipient ID is undefined");
        return;
      }

      setActiveRecipientId(recipientId);
      setActiveThreadId(threadId || null);
      setError(null);

      const cacheKey = threadId || recipientId;
      const cached = cacheRef.current[cacheKey];
      if (Array.isArray(cached) && cached.length > 0) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        let useThreadId = threadId || null;
        if (!useThreadId) {
          useThreadId = await resolveThreadIdForPartner(userId, recipientId);
          setActiveThreadId(useThreadId || null);
        }

        if (!useThreadId) {
          clearTimeout(timeoutId);
          setMessagesByRecipient((prev) => ({ ...prev, [recipientId]: [] }));
          cacheRef.current[cacheKey] = [];
          setLoading(false);
          return;
        }

        const response = await fetch(`${UNIFIED_API}/messages?threadId=${encodeURIComponent(useThreadId)}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch messages: ${response.status} - ${errorText}`);
        }

        const result = await response.json();

        if (Array.isArray(result)) {
          const transformed = result.map((m) => transformApiMessage(m, userId, useThreadId));
          const sorted = transformed.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

          setMessagesByRecipient((prev) => ({ ...prev, [recipientId]: sorted }));
          setMessagesByThread((prev) => ({ ...prev, [useThreadId]: sorted }));

          cacheRef.current[recipientId] = sorted;
          cacheRef.current[useThreadId] = sorted;
        } else {
          setError("Unexpected response format");
        }
      } catch (err) {
        console.error("Error fetching messages:", err);
        setError(err);
        setMessagesByRecipient((prev) => ({ ...prev, [recipientId]: prev[recipientId] || [] }));
        if (threadId) {
          setMessagesByThread((prev) => ({ ...prev, [threadId]: prev[threadId] || [] }));
        }
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  const addNewMessage = useCallback(
    (newMessage) => {
      const normalized = normalizeWs(newMessage) || newMessage;
      if (!normalized?.id) return;
      upsertIntoStores(normalized);
    },
    [upsertIntoStores]
  );

  const messages = (() => {
    if (activeThreadId && messagesByThread[activeThreadId]) {
      return messagesByThread[activeThreadId] || [];
    }
    return messagesByRecipient[activeRecipientId] || [];
  })();

  return {
    messages,
    loading,
    error,
    fetchMessages,
    addNewMessage,
    messagesByRecipient,
    messagesByThread,
  };
};

export default useFetchMessages;
