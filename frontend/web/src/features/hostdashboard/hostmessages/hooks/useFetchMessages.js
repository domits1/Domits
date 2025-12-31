import { useState, useCallback, useRef } from 'react';

export const useFetchMessages = (userId) => {
    const [messagesByRecipient, setMessagesByRecipient] = useState({});
    const [messagesByThread, setMessagesByThread] = useState({});
    const cacheRef = useRef({});
    const [activeRecipientId, setActiveRecipientId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchMessages = useCallback(async (recipientId, threadId = null) => {
        if (!recipientId) {
            console.error('Recipient ID is undefined');
            return;
        }

        console.log(`Fetching messages for userId: ${userId}, recipientId: ${recipientId}, threadId: ${threadId}`);
        setActiveRecipientId(recipientId);
        setError(null);

        const cacheKey = threadId || recipientId;
        const cached = cacheRef.current[cacheKey];
        if (Array.isArray(cached) && cached.length > 0) {
            console.log('Using cached messages for', cacheKey, cached.length, 'messages');
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            let response;

            // If we have a threadId, use it directly
            if (threadId) {
                console.log('Using provided threadId:', threadId);
                response = await fetch(`https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default/messages?threadId=${threadId}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    signal: controller.signal,
                });
            } else {
                // Fallback: Try to construct threadId format
                const threadId1 = `${userId}-${recipientId}`;
                const threadId2 = `${recipientId}-${userId}`;
                
                console.log('Trying threadId1:', threadId1);
                response = await fetch(`https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default/messages?threadId=${threadId1}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    signal: controller.signal,
                });

                console.log('ThreadId1 response status:', response.status);

                // If first threadId doesn't work, try the reverse
                if (!response.ok) {
                    console.log('Trying threadId2:', threadId2);
                    response = await fetch(`https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default/messages?threadId=${threadId2}`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        signal: controller.signal,
                    });
                    console.log('ThreadId2 response status:', response.status);
                }
            }

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Failed to fetch messages. Status:', response.status, 'Error:', errorText);
                throw new Error(`Failed to fetch messages: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            console.log('Messages response:', result);

            if (Array.isArray(result)) {
                const transformed = result.map(msg => {
                    // Parse metadata if it's a string
                    let metadata = msg.metadata || {};
                    if (typeof metadata === 'string') {
                        try {
                            metadata = JSON.parse(metadata);
                        } catch (e) {
                            metadata = {};
                        }
                    }
                    
                    return {
                        ...msg,
                        text: msg.content || msg.text, // Map content to text
                        isAutomated: metadata.isAutomated || false,
                        messageType: metadata.messageType || null,
                        isSent: (metadata.isAutomated) ? false : (msg.senderId === userId), // Automated messages are always received
                    };
                });
                
                const sorted = transformed.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                console.log('Sorted messages:', sorted);
                setMessagesByRecipient((prev) => ({
                    ...prev,
                    [recipientId]: sorted,
                }));
                setMessagesByThread((prev) => ({
                    ...prev,
                    [cacheKey]: sorted,
                }));
                cacheRef.current[cacheKey] = sorted;
            } else {
                console.error('Unexpected response format:', result);
                setError('Unexpected response format');
            }
        } catch (err) {
            console.error('Error fetching messages:', err);
            setError(err);
            setMessagesByRecipient((prev) => ({ ...prev, [recipientId]: prev[recipientId] || [] }));
            setMessagesByThread((prev) => ({ ...prev, [cacheKey]: [] }));
            cacheRef.current[cacheKey] = [];
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
