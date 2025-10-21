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
