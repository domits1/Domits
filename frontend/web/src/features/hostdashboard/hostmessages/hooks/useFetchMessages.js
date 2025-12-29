import { useState, useCallback, useRef } from 'react';

// Persists messages per conversation so switching contacts does not wipe history
export const useFetchMessages = (userId) => {
    // Map of recipientId -> messages[]
    const [messagesByRecipient, setMessagesByRecipient] = useState({});
    const cacheRef = useRef({});
    const [activeRecipientId, setActiveRecipientId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchMessages = useCallback(async (recipientId, options) => {
        if (!recipientId) {
            console.error('Recipient ID is undefined');
            return;
        }

        if (!userId) {
            console.error('User ID is undefined');
            return;
        }

        setActiveRecipientId(recipientId);
        setError(null);

        const skipRemote = options?.skipRemote === true;
        if (skipRemote) {
            setLoading(false);
            setMessagesByRecipient((prev) => ({
                ...prev,
                [recipientId]: prev[recipientId] || [],
            }));
            cacheRef.current[recipientId] = cacheRef.current[recipientId] || [];
            return;
        }

        const cached = cacheRef.current[recipientId];
        if (Array.isArray(cached) && cached.length > 0) {
            setLoading(false);
            return;
        }

        if (typeof recipientId === 'string' && recipientId.startsWith('test-')) {
            setLoading(false);
            setMessagesByRecipient((prev) => ({
                ...prev,
                [recipientId]: [],
            }));
            cacheRef.current[recipientId] = [];
            return;
        }

        setLoading(true);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch('https://8pwu9lnge0.execute-api.eu-north-1.amazonaws.com/General-Messaging-Production-Read-MessagesHistory', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId,
                    recipientId: recipientId,
                }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

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
                cacheRef.current[recipientId] = sorted;
            } else {
                console.error('Unexpected response format:', result);
                setError('Unexpected response format');
            }
        } catch (err) {
            console.error('Error fetching messages:', err);
            setError(err);
            setMessagesByRecipient((prev) => ({ ...prev, [recipientId]: prev[recipientId] || [] }));
            cacheRef.current[recipientId] = cacheRef.current[recipientId] || [];
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const addNewMessage = useCallback((newMessage) => {
        const partnerId = newMessage.userId === userId ? newMessage.recipientId : newMessage.userId;
        if (!partnerId) return;

        setMessagesByRecipient((prev) => {
            const current = prev[partnerId] || [];
            const exists = current.some((m) => m.id === newMessage.id);
            if (exists) return prev;

            const nextForPartner = [...current, newMessage];
            const next = { ...prev, [partnerId]: nextForPartner };
            cacheRef.current[partnerId] = nextForPartner;
            return next;
        });
    }, [userId]);

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
