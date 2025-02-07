import { useState } from 'react';


export const useSendMessage = (userId) => {
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);

    const sendMessage = async (userId, recipientId, text) => {
        setSending(true);
        try {
            const response = await fetch('https://qkptcbb445.execute-api.eu-north-1.amazonaws.com/ChatSendMessageFunction', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId,
                    recipientId: recipientId,
                    text: text,
                    createdAt: new Date().toISOString()
                })
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            const data = await response.json();
            const newMessage = JSON.parse(data.body);

            return newMessage;
        } catch (error) {
            console.error("Error sending message:", error);
            setError(error);
            throw error;
        } finally {
            setSending(false);
        }
    };

    return {
        sendMessage,
        sending,
        error
    };
};
