import { useState } from 'react';
import { sendMessage as sendOverWebSocket } from '../services/websocket';
import { getAccessToken } from '../../../../services/getAccessToken';

export const useSendMessage = (userId) => {
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);
    const token = getAccessToken(userId);

    const sendMessageHandler = async (recipientId, text, fileUrls = []) => {
        if (!userId || !recipientId || (!text.trim() && (fileUrls.length === 0))) {
            const errorMsg = "Invalid message parameters";
            setError(errorMsg);
            return { success: false, error: errorMsg };
        }
        
        const channelID = [userId, recipientId].sort().join("_");

        const message = {
            action: "sendMessage",
            accessToken: token,
            recipientId: recipientId,
            text: text,
            fileUrls: fileUrls,
            channelId: channelID,
        };
        
        setSending(true);

        try {
            // Persist via REST endpoint which stores and dispatches the message server-side
            const response = await fetch('https://tgkskhfz79.execute-api.eu-north-1.amazonaws.com/General-Messaging-Production-Create-WebSocketMessage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(message),
            });

            if (!response.ok) {
                const body = await response.text().catch(() => '');
                throw new Error(`Failed to persist message: ${response.status} ${body}`);
            }

            // Best-effort: also publish over open WebSocket for immediate peer delivery if connected
            try { sendOverWebSocket(message); } catch {}

            return { success: true };
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