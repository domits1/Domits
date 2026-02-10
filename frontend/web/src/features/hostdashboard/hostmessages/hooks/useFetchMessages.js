import { useState, useCallback, useRef } from "react";

export const useFetchMessages = (userId) => {
  const [messagesByRecipient, setMessagesByRecipient] = useState({});
  const [messagesByThread, setMessagesByThread] = useState({});
  const cacheRef = useRef({});
  const [activeRecipientId, setActiveRecipientId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMessages = useCallback(
    async (recipientId, threadId = null) => {
      if (!recipientId) {
        console.error("Recipient ID is undefined");
        return;
      }

      setActiveRecipientId(recipientId);
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
              headers: {
                "Content-Type": "application/json",
              },
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
              headers: {
                "Content-Type": "application/json",
              },
              signal: controller.signal,
            }
          );

          if (!response.ok) {
            response = await fetch(
              `https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default/messages?threadId=${threadId2}`,
              {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                },
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
              createdAt:
                typeof msg.createdAt === "number"
                  ? new Date(msg.createdAt).toISOString()
                  : msg.createdAt || new Date().toISOString(),
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
            };
          });

          const sorted = transformed.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

          setMessagesByRecipient((prev) => ({
            ...prev,
            [recipientId]: sorted,
          }));
          setMessagesByThread((prev) => ({
            ...prev,
            [cacheKey]: sorted,
          }));
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
      const partnerId = newMessage.userId === userId ? newMessage.recipientId : newMessage.userId;
      if (!partnerId) return;

      setMessagesByRecipient((prev) => {
        const current = prev[partnerId] || [];
        const exists = current.some((m) => m.id === newMessage.id);
        if (exists) return prev;

        const nextForPartner = [...current, newMessage];
        const next = { ...prev, [partnerId]: nextForPartner };
        cacheRef.current[partnerId] = nextForPartner;
        return next;
      });
    },
    [userId]
  );

  const messages = messagesByRecipient[activeRecipientId] || [];

  return {
    messages,
    loading,
    error,
    fetchMessages,
    addNewMessage,
  };
};

export default useFetchMessages;
