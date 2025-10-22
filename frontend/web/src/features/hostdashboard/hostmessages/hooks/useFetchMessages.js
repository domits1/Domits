import { useState, useCallback } from 'react';

// Persists messages per conversation so switching contacts does not wipe history
export const useFetchMessages = (userId) => {
    // Map of recipientId -> messages[]
    const [messagesByRecipient, setMessagesByRecipient] = useState({});
    const [activeRecipientId, setActiveRecipientId] = useState(null);
    const [hasMoreByRecipient, setHasMoreByRecipient] = useState({});
    const [nextCursorByRecipient, setNextCursorByRecipient] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchMessages = useCallback(async (recipientId, options) => {
        if (!recipientId) {
            console.error('Recipient ID is undefined');
            return;
        }

        setActiveRecipientId(recipientId);
        setError(null);

        // If we already have messages for this conversation, don't refetch unless forced
        const cached = messagesByRecipient[recipientId];
        const force = options && options.force === true;
        if (!force && Array.isArray(cached) && cached.length > 0) {
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
                    // Optional server support for pagination; server may ignore
                    limit: 50,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to fetch messages');
            }

            const rawResponse = await response.text();
            const result = JSON.parse(rawResponse);

            // Support two possible shapes: array or {items, nextCursor}
            const items = Array.isArray(result) ? result : Array.isArray(result?.items) ? result.items : [];
            const serverCursor = !Array.isArray(result) ? result?.nextCursor : null;

            if (Array.isArray(items)) {
                const sorted = items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                setMessagesByRecipient((prev) => ({
                    ...prev,
                    [recipientId]: sorted,
                }));
                setNextCursorByRecipient((prev) => ({ ...prev, [recipientId]: serverCursor || null }));
                setHasMoreByRecipient((prev) => ({ ...prev, [recipientId]: !!serverCursor }));
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
    const hasMore = hasMoreByRecipient[activeRecipientId] || false;
    const nextCursor = nextCursorByRecipient[activeRecipientId] || null;

    // Load older messages (prepend) for the active conversation
    const loadOlder = useCallback(async () => {
        const recipientId = activeRecipientId;
        if (!recipientId) return;
        const cursor = nextCursorByRecipient[recipientId];
        if (!cursor) return; // nothing more to load

        setLoading(true);
        try {
            const response = await fetch('https://8pwu9lnge0.execute-api.eu-north-1.amazonaws.com/General-Messaging-Production-Read-MessagesHistory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, recipientId, cursor, limit: 50 }),
            });

            if (!response.ok) throw new Error('Failed to fetch older messages');
            const raw = await response.text();
            const result = JSON.parse(raw);

            const items = Array.isArray(result) ? result : Array.isArray(result?.items) ? result.items : [];
            const serverCursor = !Array.isArray(result) ? result?.nextCursor : null;

            const sorted = items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            setMessagesByRecipient((prev) => {
                const current = prev[recipientId] || [];
                // Prepend older items
                const merged = [...sorted, ...current];
                return { ...prev, [recipientId]: merged };
            });
            setNextCursorByRecipient((prev) => ({ ...prev, [recipientId]: serverCursor || null }));
            setHasMoreByRecipient((prev) => ({ ...prev, [recipientId]: !!serverCursor }));
        } catch (err) {
            console.error('Error fetching older messages:', err);
        } finally {
            setLoading(false);
        }
    }, [activeRecipientId, userId, nextCursorByRecipient]);

    return {
        messages,
        loading,
        error,
        fetchMessages,
        addNewMessage,
        hasMore,
        loadOlder,
    };
};

export default useFetchMessages;
