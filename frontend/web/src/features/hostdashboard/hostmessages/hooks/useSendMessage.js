import { useState } from 'react';
import { sendMessage } from '../services/websocket';
import { getAccessToken } from '../../../../services/getAccessToken';

const UNIFIED_MESSAGING_API = "https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default";

export const useSendMessage = (userId) => {
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);
    const token = getAccessToken(userId);

    const sendMessageHandler = async (recipientId, text, fileUrls = [], threadId = null, propertyId = null) => {
        if (!userId || !recipientId || (!text.trim() && (fileUrls.length === 0))) {
            const errorMsg = "Invalid message parameters";
            setError(errorMsg);
            return { success: false, error: errorMsg };
        }
        
        setSending(true);

        try {
            // Note: The backend will determine hostId/guestId based on the thread lookup
            // We just need to pass senderId and recipientId

            // Prepare attachments if any
            const attachments = fileUrls.length > 0 
                ? JSON.stringify(fileUrls.map(url => ({ url, type: 'image', name: url.split('/').pop() })))
                : null;

            // Send message via UnifiedMessaging API
            const messagePayload = {
                senderId: userId,
                recipientId: recipientId,
                content: text.trim(),
                threadId: threadId, // Use provided threadId if available
                propertyId: propertyId,
                platform: "DOMITS",
                attachments: attachments,
                metadata: JSON.stringify({ 
                    isAutomated: false,
                    fileUrls: fileUrls 
                }),
            };

            const response = await fetch(`${UNIFIED_MESSAGING_API}/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(messagePayload),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to send message: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            const savedMessage = result.response || result;

            // Also send via WebSocket for real-time delivery
            const channelID = [userId, recipientId].sort().join("_");
            const wsMessage = {
                action: "sendMessage",
                accessToken: token,
                recipientId: recipientId,
                text: text,
                fileUrls: fileUrls,
                channelId: channelID,
                threadId: savedMessage.threadId || threadId, // Include threadId in WebSocket message
            };

            try {
                sendMessage(wsMessage);
            } catch (wsError) {
                console.warn("WebSocket send failed, but message was saved:", wsError);
            }

            return { 
                success: true, 
                message: savedMessage,
                threadId: savedMessage.threadId || threadId 
            };
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