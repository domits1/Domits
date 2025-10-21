<<<<<<< Updated upstream
import { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_PREFIX = 'domits_room_msgs_';

export const useLocalRoomMessages = (roomCode, userId) => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const channelRef = useRef(null);
    const storageKey = `${STORAGE_PREFIX}${roomCode}`;

    useEffect(() => {
        try {
            const raw = window.localStorage.getItem(storageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    setMessages(parsed);
                }
            }
        } catch (e) {
            // ignore parse errors
        } finally {
            setLoading(false);
        }

        const channelName = `domits-room-${roomCode}`;
        const ch = new BroadcastChannel(channelName);
        ch.onmessage = (ev) => {
            const incoming = ev.data;
            if (!incoming || !incoming.id) return;
            setMessages((prev) => {
                const exists = prev.some((m) => m.id === incoming.id);
                if (exists) return prev;
                // Append to end so newest at bottom
                const next = [...prev, incoming];
                try { window.localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
                return next;
            });
        };
        channelRef.current = ch;

        const onStorage = (e) => {
            if (e.key !== storageKey) return;
            try {
                const parsed = JSON.parse(e.newValue);
                if (Array.isArray(parsed)) {
                    setMessages(parsed);
                }
            } catch {}
        };
        window.addEventListener('storage', onStorage);

        return () => {
            try { ch.close(); } catch {}
            window.removeEventListener('storage', onStorage);
        };
    }, [roomCode, storageKey]);

    const addNewMessage = useCallback((msg) => {
        setMessages((prev) => {
            const exists = prev.some((m) => m.id === msg.id);
            if (exists) return prev;
            const next = [...prev, msg];
            try { window.localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
            return next;
        });
    }, [storageKey]);

    const sendLocalMessage = useCallback((text, fileUrls = []) => {
        const message = {
            id: uuidv4(),
            userId,
            recipientId: `pair:${roomCode}`,
            text: text || '',
            fileUrls,
            createdAt: new Date().toISOString(),
            isSent: true,
        };
        addNewMessage(message);
        try { channelRef.current?.postMessage(message); } catch {}
        return { success: true };
    }, [addNewMessage, roomCode, userId]);

    return { messages, loading, addNewMessage, sendLocalMessage };
};

export default useLocalRoomMessages;


=======
import { useState, useEffect, useCallback } from 'react';

const useLocalRoomMessages = (roomCode, userId) => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadMessages = () => {
            try {
                const storedMessages = localStorage.getItem(`localMessages_${roomCode}`);
                if (storedMessages) {
                    setMessages(JSON.parse(storedMessages));
                }
            } catch (error) {
                console.error('Error loading local messages:', error);
            }
        };

        loadMessages();
    }, [roomCode]);

    useEffect(() => {
        try {
            localStorage.setItem(`localMessages_${roomCode}`, JSON.stringify(messages));
        } catch (error) {
            console.error('Error saving local messages:', error);
        }
    }, [messages, roomCode]);

    const addNewMessage = useCallback((message) => {
        setMessages(prev => {
            const exists = prev.some(msg => msg.id === message.id);
            if (exists) return prev;
            
            return [...prev, message];
        });
    }, []);

    const sendLocalMessage = useCallback((text, fileUrls = []) => {
        if (!text.trim() && fileUrls.length === 0) {
            return { success: false, error: 'Message cannot be empty' };
        }

        const newMessage = {
            id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId,
            recipientId: 'local',
            text: text.trim(),
            fileUrls,
            createdAt: new Date().toISOString(),
            isSent: true,
            isLocal: true
        };

        addNewMessage(newMessage);

        try {
            const channel = new BroadcastChannel(`localMessages_${roomCode}`);
            channel.postMessage({
                type: 'NEW_MESSAGE',
                message: newMessage
            });
            channel.close();
        } catch (error) {
            console.error('Error broadcasting message:', error);
        }

        return { success: true };
    }, [userId, roomCode, addNewMessage]);

    useEffect(() => {
        const channel = new BroadcastChannel(`localMessages_${roomCode}`);
        
        const handleMessage = (event) => {
            if (event.data.type === 'NEW_MESSAGE') {
                addNewMessage(event.data.message);
            }
        };

        channel.addEventListener('message', handleMessage);

        return () => {
            channel.removeEventListener('message', handleMessage);
            channel.close();
        };
    }, [roomCode, addNewMessage]);

    return {
        messages,
        loading,
        addNewMessage,
        sendLocalMessage
    };
};

export default useLocalRoomMessages;
>>>>>>> Stashed changes
