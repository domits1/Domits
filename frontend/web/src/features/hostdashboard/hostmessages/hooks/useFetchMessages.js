import { useState, useCallback, useRef, useEffect, useContext } from "react";
import { WebSocketContext } from "../context/webSocketContext";

const toIso = (v) => {
  if (!v) return new Date().toISOString();
  if (typeof v === "number") return new Date(v).toISOString();
  const d = new Date(v);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

const normalizeWs = (raw) => {
  if (!raw || typeof raw !== "object") return null;

  // some payloads may come wrapped, keep it safe
  const msg = raw?.message && typeof raw.message === "object" ? raw.message : raw;

  // ignore non-message payloads (ping, status, etc.)
  const type = msg?.type || raw?.type;
  if (type && type !== "message") {
    // allow messages that don't include type but have sender/recipient
    const hasIds = !!(msg?.senderId || msg?.userId) && !!msg?.recipientId;
    if (!hasIds) return null;
  }

  const senderId = msg?.senderId || msg?.userId || null;
  const recipientId = msg?.recipientId || null;
  if (!senderId || !recipientId) return null;

  const text = msg?.text ?? msg?.content ?? "";
  const content = msg?.content ?? msg?.text ?? "";

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

  const createdAt = toIso(msg?.createdAt);

  const id =
    msg?.id ||
    `${senderId}:${recipientId}:${createdAt}:${String(text).slice(0, 40)}:${fileUrls.length}`;

  let metadata = msg?.metadata || {};
  if (typeof metadata === "string") {
    try {
      metadata = JSON.parse(metadata);
    } catch {
      metadata = {};
    }
  }

  return {
    ...msg,
    id,
    threadId: msg?.threadId || null,
    senderId: msg?.senderId || senderId,
    recipientId,
    userId: senderId, // existing UI expects userId = senderId
    text,
    content,
    createdAt,
    fileUrls,
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

      const partnerId =
        newMessage.userId === userId ? newMessage.recipientId : newMessage.userId;

      if (!partnerId) return;

      const threadKey = newMessage.threadId || null;

      setMessagesByRecipient((prev) => {
        const current = prev[partnerId] || [];
        if (current.some((m) => m.id === newMessage.id)) return prev;

        const nextForPartner = [...current, newMessage].sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );

        const next = { ...prev, [partnerId]: nextForPartner };
        cacheRef.current[partnerId] = nextForPartner;
        return next;
      });

      if (threadKey) {
        setMessagesByThread((prev) => {
          const current = prev[threadKey] || [];
          if (current.some((m) => m.id === newMessage.id)) return prev;

          const nextForThread = [...current, newMessage].sort(
            (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
          );

          const next = { ...prev, [threadKey]: nextForThread };
          cacheRef.current[threadKey] = nextForThread;
          return next;
        });
      }
    },
    [userId]
  );

  // realtime -> push into same store as REST fetch results
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

        let response;

        if (threadId) {
          response = await fetch(
            `https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default/messages?threadId=${threadId}`,
            {
              method: "GET",
              headers: { "Content-Type": "application/json" },
              signal: controller.signal,
            }
          );
        } else {
          const threadId1 = `${userId}-${recipientId}`;
          const threadId2 = `${recipientId}-${userId}`;

          response = await fetch(
            `https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default/messages?threadId=${threadId1}`,
            {
              method: "GET",
              headers: { "Content-Type": "application/json" },
              signal: controller.signal,
            }
          );

          if (!response.ok) {
            response = await fetch(
              `https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default/messages?threadId=${threadId2}`,
              {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                signal: controller.signal,
              }
            );
          }
        }

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch messages: ${response.status} - ${errorText}`);
        }

        const result = await response.json();

        if (Array.isArray(result)) {
          const transformed = result.map((msg) => {
            let metadata = msg.metadata || {};
            if (typeof metadata === "string") {
              try {
                metadata = JSON.parse(metadata);
              } catch {
                metadata = {};
              }
            }

            return {
              ...msg,
              userId: msg.senderId,
              text: msg.content || msg.text || "",
              isAutomated: metadata.isAutomated || false,
              messageType: metadata.messageType || null,
              isSent: metadata.isAutomated ? false : msg.senderId === userId,
              createdAt: toIso(msg.createdAt),
              fileUrls: (() => {
                const at = msg.attachments;
                if (!at) return [];
                if (Array.isArray(at)) return at.map((x) => x?.url).filter(Boolean);
                if (typeof at === "string") {
                  try {
                    const parsed = JSON.parse(at);
                    return Array.isArray(parsed) ? parsed.map((x) => x?.url).filter(Boolean) : [];
                  } catch {
                    return [];
                  }
                }
                return [];
              })(),
              metadata,
            };
          });

          const sorted = transformed.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

          setMessagesByRecipient((prev) => ({ ...prev, [recipientId]: sorted }));
          setMessagesByThread((prev) => ({ ...prev, [cacheKey]: sorted }));
          cacheRef.current[cacheKey] = sorted;
        } else {
          setError("Unexpected response format");
        }
      } catch (err) {
        console.error("Error fetching messages:", err);
        setError(err);
        setMessagesByRecipient((prev) => ({ ...prev, [recipientId]: prev[recipientId] || [] }));
        setMessagesByThread((prev) => ({ ...prev, [cacheKey]: [] }));
        cacheRef.current[cacheKey] = [];
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
  };
};

export default useFetchMessages;
