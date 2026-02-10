import { useState } from "react";
import { getAccessToken } from "../../../../services/getAccessToken";
import { sendUnifiedMessage } from "../services/messagingService";

export const useSendMessage = (userId) => {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const token = getAccessToken(userId);

  const sendMessageHandler = async (
    recipientId,
    text,
    fileUrls = [],
    { threadId = null, propertyId = null, metadata = {} } = {}
  ) => {
    if (!userId || !recipientId || (!text?.trim() && (!Array.isArray(fileUrls) || fileUrls.length === 0))) {
      const errorMsg = "Invalid message parameters";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    const attachments =
      Array.isArray(fileUrls) && fileUrls.length > 0
        ? fileUrls.map((url) => ({
            url,
            type: url.endsWith(".mp4") ? "video/mp4" : "image",
            name: "",
          }))
        : null;

    setSending(true);
    setError(null);

    try {
      const saved = await sendUnifiedMessage({
        senderId: userId,
        recipientId,
        propertyId,
        content: text || "",
        platform: "DOMITS",
        metadata: {
          isAutomated: false,
          ...metadata,
        },
        attachments,
        threadId,
      });

      return { success: true, data: saved, accessToken: token };
    } catch (err) {
      console.error("⚠️ Error sending message:", err);
      const msg = err?.message || "Failed to send";
      setError(msg);
      return { success: false, error: msg };
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
