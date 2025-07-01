import { useState, useEffect } from 'react';
import { sendMessage } from '../services/websocket';
import RetrieveAccessToken from '../../../features/auth/RetrieveAccessToken';

export const useSendMessage = (userId) => {
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);
     const [token, setToken] = useState(null);
    useEffect(() => {
        const fetchToken = async () => {
            const accessToken = await RetrieveAccessToken();
            setToken(accessToken);
        };
        fetchToken();
    }, []);

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