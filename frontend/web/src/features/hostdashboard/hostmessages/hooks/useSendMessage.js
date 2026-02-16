import { useState } from "react";
import { sendMessage as sendWebSocketMessage } from "../services/websocket";
import { sendUnifiedMessage } from "../services/messagingService";
import { getAccessToken } from "../../../../services/getAccessToken";

export const useSendMessage = (userId) => {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const sendMessageHandler = async (recipientId, text, fileUrls = [], options = {}) => {
    if (!userId || !recipientId || (!String(text || "").trim() && (fileUrls || []).length === 0)) {
      const errorMsg = "Invalid message parameters";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    setSending(true);
    setError(null);

    const token = getAccessToken();
    const channelID = [userId, recipientId].sort().join("_");

    try {
      // REST source-of-truth
      const saved = await sendUnifiedMessage({
        senderId: userId,
        recipientId,
        content: text,
        fileUrls,
        propertyId: options.propertyId ?? null,
        threadId: options.threadId ?? null,
        metadata: { isAutomated: false, ...(options.metadata || {}) },
      });

      // WS push (backend will persist too, but even if WS fails, REST already saved)
      try {
        sendWebSocketMessage({
          action: "sendMessage",
          accessToken: token,
          recipientId,
          text,
          fileUrls,
          channelId: channelID,
          threadId: saved?.threadId || options.threadId || null,
          propertyId: options.propertyId ?? null,
          metadata: { isAutomated: false, ...(options.metadata || {}) },
        });
      } catch (wsErr) {}

      return { success: true, saved };
    } catch (err) {
      setError(err);
      return { success: false, error: err?.message || String(err) };
    } finally {
      setSending(false);
    }
  };

  return { sendMessage: sendMessageHandler, sending, error };
};