import React, { useEffect, useState, useCallback, useContext } from 'react';
import useFetchMessages from '../hooks/useFetchMessages';
import { useSendMessage } from '../hooks/useSendMessage';
import ChatMessage from './chatMessage';
import { WebSocketContext } from '../context/webSocketContext';
import '../styles/hostChatScreen.css';

const HostChatScreen = ({ userId, contactId, contactName, connectionId }) => {
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
                addNewMessage(msg);
            }
        });
    }, [wsMessages, userId, contactId]);

    const handleSendMessage = async () => {
        if (newMessage.trim()) {
            try {
                await sendMessage(contactId, newMessage, connectionId);


                const sentMessage = {
                    id: Date.now(), // Temporary unique ID
                    userId,
                    recipientId: contactId,
                    text: newMessage,
                    createdAt: new Date().toISOString(),
                    isSent: true,
                };

                addNewMessage(sentMessage);

                setNewMessage('');
            } catch (error) {
                console.error('Error sending message:', error);
            }
        }
    };


    return (
        <div className="host-chat-screen">
            <div className="chat-header">
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

            <div className="chat-input">
                <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder=""
                    className="message-input-textarea"
                    onKeyUp={(e) => {
                        if (e.key === "Enter") {
                            handleSendMessage();
                        }
                    }}
                />
                <button
                    onClick={handleSendMessage}
                    className="message-input-send-button"
                    disabled={sending}
                >
                    {sending ? 'Sending...' : 'Send'}
                </button>
            </div>

            {sendError && <p className="error-message">{sendError.message}</p>}
        </div>
    );
};

export default HostChatScreen;
