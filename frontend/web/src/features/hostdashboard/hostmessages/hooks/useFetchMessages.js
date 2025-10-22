import { useState, useCallback } from 'react';

// Persists messages per conversation so switching contacts does not wipe history
export const useFetchMessages = (userId) => {
    // Map of recipientId -> messages[]
    const [messagesByRecipient, setMessagesByRecipient] = useState({});
    const [activeRecipientId, setActiveRecipientId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchMessages = useCallback(async (recipientId) => {
        if (!recipientId) {
            console.error('Recipient ID is undefined');
            return;
        }

        setActiveRecipientId(recipientId);
        setError(null);

        // If we already have messages for this conversation, don't refetch unnecessarily
        const cached = messagesByRecipient[recipientId];
        if (Array.isArray(cached) && cached.length > 0) {
            return; // keep existing cached messages
        }

        setLoading(true);
        try {
            const response = await fetch('https://8pwu9lnge0.execute-api.eu-north-1.amazonaws.com/General-Messaging-Production-Read-MessagesHistory', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId,
                    recipientId: recipientId,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to fetch messages');
            }

            const rawResponse = await response.text();
            const result = JSON.parse(rawResponse);

            if (Array.isArray(result)) {
                const sorted = result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                setMessagesByRecipient((prev) => ({
                    ...prev,
                    [recipientId]: sorted,
                }));
            } else {
                console.error('Unexpected response format:', result);
                setError('Unexpected response format');
            }
        } catch (err) {
            console.error('Error fetching messages:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [userId, messagesByRecipient]);

    const addNewMessage = useCallback((newMessage) => {
        // Determine the other participant to decide which conversation to place this in
        const partnerId = newMessage.userId === userId ? newMessage.recipientId : newMessage.userId;
        if (!partnerId) return;

        setMessagesByRecipient((prev) => {
            const current = prev[partnerId] || [];
            const exists = current.some((m) => m.id === newMessage.id);
            if (exists) return prev;

            const nextForPartner = [...current, newMessage];
            return { ...prev, [partnerId]: nextForPartner };
        });
    }, [userId]);

    // Expose the messages for the active conversation so existing components keep working
    const messages = messagesByRecipient[activeRecipientId] || [];

    return {
        messages,
        loading,
        error,
        fetchMessages,
        addNewMessage,
    };
};

export default useFetchMessages;
