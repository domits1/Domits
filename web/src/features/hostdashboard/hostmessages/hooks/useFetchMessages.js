import { useState, useCallback } from 'react';

export const useFetchMessages = (userId) => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchMessages = useCallback(async (recipientId) => {
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

            const rawResponse = await response.text();
            const result = JSON.parse(rawResponse);

            if (Array.isArray(result)) {
                const allChats = result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                setMessages(allChats);
            } else {
                console.error("Unexpected response format:", result);
                setError("Unexpected response format");
            }
        } catch (error) {
            console.error("Error fetching messages:", error);
            setError(error);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const addNewMessage = useCallback((newMessage) => {
        setMessages((prevMessages) => {
            const messageExists = prevMessages.some((msg) => msg.id === newMessage.id);
            if (!messageExists) {
                return [newMessage, ...prevMessages];
            }
            return prevMessages;
        });
    }, []);

    return {
        messages,
        loading,
        error,
        fetchMessages,
        addNewMessage,
    };
};

export default useFetchMessages;
