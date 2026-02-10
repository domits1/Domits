import { useState } from "react";
import { getAccessToken } from "../../../../services/getAccessToken";

const UNIFIED_MESSAGING_API = "https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default";

export const useSendMessage = (userId) => {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const token = getAccessToken(userId);

  const sendMessageHandler = async (recipientId, text, fileUrls = [], threadId = null) => {
    if (!userId || !recipientId || (!text.trim() && fileUrls.length === 0)) {
      const errorMsg = "Invalid message parameters";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    setSending(true);
    setError(null);

    try {
      const payload = {
        senderId: userId,
        recipientId,
        content: text,
        platform: "DOMITS",
        threadId: threadId || undefined,
        metadata: { isAutomated: false },
        attachments:
          Array.isArray(fileUrls) && fileUrls.length > 0
            ? fileUrls.map((url) => ({
                url,
                type: url.endsWith(".mp4") ? "video" : "image",
                name: url.split("/").pop() || "attachment",
              }))
            : undefined,
      };

      const res = await fetch(`${UNIFIED_MESSAGING_API}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: token } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`UnifiedMessaging send failed: ${res.status} - ${errText}`);
      }

      const created = await res.json();
      return { success: true, data: created };
    } catch (err) {
      console.error("⚠️ Error sending message:", err);
      setError(err);
      return { success: false, error: err.message };
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
