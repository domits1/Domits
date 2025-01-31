import { useState } from 'react';

export const useFetchMessages = (userId) => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchMessages = async (recipientId) => {
        if (!recipientId) {
            console.error("Recipient ID is undefined");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('https://8pwu9lnge0.execute-api.eu-north-1.amazonaws.com/General-Messaging-Production-Read-MessagesHistory', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId,
                    recipientId: recipientId
                })
            });

            if (!response.ok) {
                throw new Error('Failed to fetch messages');
            }

            const data = await response.json();
            const parsedData = JSON.parse(data.body);

            const sortedMessages = parsedData.sort((a, b) => 
                new Date(a.createdAt) - new Date(b.createdAt)
            );

            setMessages(sortedMessages);
        } catch (error) {
            console.error("Error fetching messages:", error);
            setError(error);
        } finally {
            setLoading(false);
        }
    };

    return {
        messages,
        loading,
        error,
        fetchMessages
    };
};
