import { useState } from 'react';
import { sendMessage } from '../services/websocket';

export const useSendMessage = (userId) => {
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);

    const sendMessageHandler = async (recipientId, text, connectionId) => {
        if (!userId || !recipientId || !text) {
            setError("Invalid message parameters");
            return;
        }
        
        const channelID = [userId, recipientId].sort().join("_");

        const message = {
            action: "sendMessage",
            connectionId: connectionId,
            userId: userId,
            recipientId: recipientId,
            text: text,
            channelId: channelID,
        };
        

        setSending(true);

        try {
            sendMessage(message); // Uses WebSocket to send message
        } catch (err) {
            console.error("⚠️ Error sending message:", err);
            setError(err);
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