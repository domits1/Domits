import { useState } from 'react';
import { sendMessage } from '../services/websocket';

export const useSendMessage = (userId) => {
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);

    const sendMessageHandler = async (recipientId, text, connectionId, fileUrls = []) => {
        if (!userId || !recipientId || (!text.trim() && (fileUrls.length === 0))) {
            const errorMsg = "Invalid message parameters";
            setError(errorMsg);
            return { success: false, error: errorMsg };
        }
        
        const channelID = [userId, recipientId].sort().join("_");

        const message = {
            action: "sendMessage",
            recipientConnectionId: connectionId,
            userId: userId,
            recipientId: recipientId,
            text: text,
            fileUrls: fileUrls,
            channelId: channelID,
        };
        

        setSending(true);

        try {
            sendMessage(message); 
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