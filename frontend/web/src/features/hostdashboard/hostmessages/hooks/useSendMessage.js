import { useState } from "react";
import { sendMessage as sendWebSocketMessage } from "../services/websocket";
import { sendUnifiedMessage } from "../services/messagingService";
import { getAccessToken } from "../../../../services/getAccessToken";

const pick = (...vals) => vals.find((v) => v !== undefined && v !== null);

const requireToken = (token) => {
  const normalized = String(token || "").trim();
  if (!normalized) throw new Error("Authentication token is required.");
  return normalized;
};

export const useSendMessage = (userId, accessToken = null) => {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const sendMessageHandler = async (recipientId, text, fileUrls = [], options = {}) => {
    if (!userId || !recipientId || (!String(text || "").trim() && (fileUrls || []).length === 0)) {
      const errorMsg = "Invalid message parameters";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    if (String(recipientId) === String(userId)) {
      const errorMsg = "BUG: recipientId equals senderId (sending to yourself).";
      console.error("[useSendMessage]", errorMsg, { userId, recipientId, options });
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    setSending(true);
    setError(null);

    let token = accessToken || null;
    try {
      token = requireToken(token || (await Promise.resolve(getAccessToken(userId))));
    } catch (authError) {
      const errorMsg = authError?.message || "Authentication token is required.";
      setError(errorMsg);
      setSending(false);
      return { success: false, error: errorMsg };
    }

    const platform = String(options.platform || "DOMITS").toUpperCase();
    const isWhatsApp = platform === "WHATSAPP";
    const channelID = [userId, recipientId].sort().join("_");

    try {
      const metadata = options.metadata ? { isAutomated: false, ...options.metadata } : { isAutomated: false };

      const saved = await sendUnifiedMessage({
        senderId: userId,
        recipientId,
        content: text,
        fileUrls,
        propertyId: options.propertyId ?? null,
        threadId: options.threadId ?? null,
        bookingId: options.bookingId ?? null,
        hostId: options.hostId ?? null,
        guestId: options.guestId ?? null,
        metadata,
        platform,
        integrationAccountId: options.integrationAccountId ?? null,
        externalThreadId: options.externalThreadId ?? null,
        token,
      });

      const savedId = pick(saved?.id, saved?.messageId, saved?.message?.id);
      const savedCreatedAt = pick(saved?.createdAt, saved?.message?.createdAt);
      const savedThreadId = pick(saved?.threadId, saved?.message?.threadId, options.threadId, null);

      if (!isWhatsApp) {
        try {
          sendWebSocketMessage({
            action: "sendMessage",
            senderId: userId,
            userId,
            recipientId,
            text,
            content: text,
            fileUrls,
            channelId: channelID,
            threadId: savedThreadId,
            propertyId: options.propertyId ?? null,
            bookingId: options.bookingId ?? null,
            hostId: options.hostId ?? null,
            guestId: options.guestId ?? null,
            metadata,
            accessToken: token || undefined,
            id: savedId || undefined,
            createdAt: savedCreatedAt || undefined,
            type: "message",
            platform,
          });
        } catch {}
      }

      return {
        success: true,
        saved: {
          ...saved,
          threadId: savedThreadId,
          platform,
          integrationAccountId: options.integrationAccountId ?? null,
          externalThreadId: options.externalThreadId ?? null,
          bookingId: options.bookingId ?? null,
        },
      };
    } catch (err) {
      setError(err);
      return { success: false, error: err?.message || String(err) };
    } finally {
      setSending(false);
    }
  };

  return { sendMessage: sendMessageHandler, sending, error };
};
