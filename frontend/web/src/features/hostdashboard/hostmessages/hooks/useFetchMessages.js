import { useState, useCallback, useRef } from 'react';

// Persists messages per conversation so switching contacts does not wipe history
export const useFetchMessages = (userId) => {
    // Map of recipientId -> messages[]
    const [messagesByRecipient, setMessagesByRecipient] = useState({});
    const cacheRef = useRef({});
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
        const cached = cacheRef.current[recipientId];
        if (Array.isArray(cached) && cached.length > 0) {
            // Ensure UI is not stuck in loading state when switching to cached chat
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            // Fetch messages from UnifiedMessaging API
            const response = await fetch(`https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default/messages?userId=${userId}&recipientId=${recipientId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error('Failed to fetch messages');
            }

            const result = await response.json();

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
            // Ensure cache holds at least an empty array so UI can render empty state
            setMessagesByRecipient((prev) => ({ ...prev, [recipientId]: prev[recipientId] || [] }));
            cacheRef.current[recipientId] = cacheRef.current[recipientId] || [];
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const addNewMessage = useCallback((newMessage) => {
        // Determine the other participant to decide which conversation to place this in
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
