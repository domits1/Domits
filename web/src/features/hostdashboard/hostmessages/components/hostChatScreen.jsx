import React, { useEffect, useState, useCallback } from 'react';
import useFetchMessages from '../hooks/useFetchMessages';
import { useSendMessage } from '../hooks/useSendMessage';
import ChatMessage from './chatMessage';
import '../styles/hostChatScreen.css';

const HostChatScreen = ({ userId, contactId, contactName }) => {
    const { messages, loading, error, fetchMessages } = useFetchMessages(userId);
    const { sendMessage, sending, error: sendError } = useSendMessage(userId);
    const [newMessage, setNewMessage] = useState('');



    useEffect(() => {
        if (contactId) {
            fetchMessages(contactId)
            console.log(contactName)
        }
    }, [userId, contactId]);

    useEffect(() => {
        console.log("Fetched messages:", messages);
    }, [messages]);

    const handleSendMessage = async () => {
        if (newMessage.trim()) {
            try {
                const message = await sendMessage(contactId, newMessage);
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
                    placeholder="Type a message..."
                    className="message-input-textarea"
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
