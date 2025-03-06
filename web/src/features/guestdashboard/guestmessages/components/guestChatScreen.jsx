import React, { useEffect, useState, useCallback, useContext } from 'react';
import useFetchMessages from '../hooks/useFetchMessages';
import { useSendMessage } from '../hooks/useSendMessage';
import ChatMessage from './chatMessage';
import { WebSocketContext } from '../context/webSocketContext';
import '../styles/guestChatScreen.css'
import { v4 as uuidv4 } from 'uuid';


const GuestChatScreen = ({ userId, contactId, contactName, connectionId, handleContactListMessage }) => {
    const { messages, loading, error, fetchMessages, addNewMessage } = useFetchMessages(userId);
    const { sendMessage, sending, error: sendError } = useSendMessage(userId);
    const [newMessage, setNewMessage] = useState('');
    const { messages: wsMessages } = useContext(WebSocketContext);

    useEffect(() => {
        if (contactId) {
            fetchMessages(contactId);
        }
    }, [userId, contactId, fetchMessages]);

    useEffect(() => {
        wsMessages.forEach((msg) => {
            if (
                (msg.userId === userId && msg.recipientId === contactId) ||
                (msg.userId === contactId && msg.recipientId === userId)
            ) {
                console.log(wsMessages)
                addNewMessage(msg);
            }
        });
    }, [wsMessages, userId, contactId]);

    const handleSendMessage = async () => {
        if (newMessage.trim()) {
            try {
                const response = await sendMessage(contactId, newMessage, connectionId);

                if (!response || !response.success) {
                    alert(`Fout bij verzenden: ${response.error || "Probeer het later opnieuw."}`);
                    return;
                }

                const sentMessage = {
                    id: uuidv4(),
                    userId,
                    recipientId: contactId,
                    text: newMessage,
                    createdAt: new Date().toISOString(),
                    isSent: true,
                };

                handleContactListMessage(sentMessage);

                addNewMessage(sentMessage);

                setNewMessage('');
            } catch (error) {
                console.error("Onverwachte fout bij verzenden:", error);
            }
        }
    };

    return (
        <div className="guest-chat-screen">
            <div className="guest-chat-header">
                <h2>{contactName}</h2>
            </div>

            <div className="chat-screen">
                {loading ? (
                    <p>Loading messages...</p>
                ) : error ? (
                    <p>{error}</p>
                ) : (
                    messages.map((message) => (
                        <ChatMessage
                            key={message.id}
                            message={message}
                            userId={userId}
                            contactName={contactName}
                        />
                    ))
                )}
            </div>

            <div className="guest-chat-input">
                <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder=""
                    className="guest-message-input-textarea"
                    onKeyUp={(e) => {
                        if (e.key === "Enter") {
                            handleSendMessage();
                        }
                    }}
                />
                <button
                    onClick={handleSendMessage}
                    className="guest-message-input-send-button"
                    disabled={sending}
                >
                    {sending ? 'Sending...' : 'Send'}
                </button>
            </div>

            {sendError && <p className="error-message">{sendError.message}</p>}
        </div>
    );

};

export default GuestChatScreen;