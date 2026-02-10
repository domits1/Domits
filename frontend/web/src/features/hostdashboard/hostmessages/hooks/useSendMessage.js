import { useState } from "react";
import { sendUnifiedMessage } from "../services/messagingService";

export const useSendMessage = (userId) => {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const sendMessageHandler = async (recipientId, text, fileUrls = [], threadId = null, propertyId = null) => {
    if (!userId || !recipientId || (!text?.trim() && (fileUrls?.length || 0) === 0)) {
      const errorMsg = "Invalid message parameters";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    setSending(true);
    setError(null);

    try {
      const created = await sendUnifiedMessage({
        senderId: userId,
        recipientId,
        threadId,
        propertyId,
        content: text || "",
        attachments: Array.isArray(fileUrls) && fileUrls.length > 0 ? JSON.stringify(fileUrls) : null,
        platform: "DOMITS",
        metadata: { isAutomated: false },
      });

      return { success: true, data: created };
    } catch (err) {
      console.error("⚠️ Error sending via UnifiedMessaging:", err);
      setError(err?.message || String(err));
      return { success: false, error: err?.message || String(err) };
    } finally {
      setSending(false);
    }
  };

  return {
    sendMessage: sendMessageHandler,
    sending,
    error,
  };
};