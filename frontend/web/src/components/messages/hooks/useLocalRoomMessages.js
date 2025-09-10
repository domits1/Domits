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
                const next = [...prev, incoming];
                try { window.localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
                return next;
            });
        };
        channelRef.current = ch;

        return () => {
            try { ch.close(); } catch {}
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


