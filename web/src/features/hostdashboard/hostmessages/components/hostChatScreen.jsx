import React, { useEffect, useState, useContext } from 'react';
import useFetchMessages from '../hooks/useFetchMessages';
import { useSendMessage } from '../hooks/useSendMessage';
import useFetchBookingDetails from '../hooks/useFetchBookingDetails';
import ChatMessage from './chatMessage';
import ChatUploadAttachment from './chatUploadAttachment';
import { WebSocketContext } from '../context/webSocketContext';
import { v4 as uuidv4 } from 'uuid';
import profileImage from '../domits-logo.jpg';
import { FaPaperPlane, FaArrowLeft } from 'react-icons/fa';

const HostChatScreen = ({ userId, contactId, contactName, connectionId, handleContactListMessage, onBack }) => {
    const { messages, loading, error, fetchMessages, addNewMessage } = useFetchMessages(userId);
    const { bookingDetails } = useFetchBookingDetails(userId, contactId);
    const { sendMessage, sending, error: sendError } = useSendMessage(userId);
    const [newMessage, setNewMessage] = useState('');
    const { messages: wsMessages } = useContext(WebSocketContext);
    const [uploadedFileUrls, setUploadedFileUrls] = useState([]);

    const handleUploadComplete = (url) => {
        setUploadedFileUrls((prev) => {
            if (!prev.includes(url)) {
                return [...prev, url];
            }
            return prev;
        });
    };

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
        if ((newMessage.trim() || uploadedFileUrls.length > 0) && (uploadedFileUrls.length > 0 || newMessage.trim())) {
            try {
                const response = await sendMessage(contactId, newMessage, connectionId, uploadedFileUrls);
                if (!response || !response.success) {
                    alert(`Fout bij verzenden: ${response.error || "Probeer het later opnieuw."}`);
                    return;
                }

                const sentMessage = {
                    id: uuidv4(),
                    userId,
                    recipientId: contactId,
                    text: newMessage,
                    fileUrls: uploadedFileUrls,
                    createdAt: new Date().toISOString(),
                    isSent: true,
                };

                handleContactListMessage(sentMessage);

                addNewMessage(sentMessage);

                setNewMessage('');
                setUploadedFileUrls([]);
            } catch (error) {
                console.error("Onverwachte fout bij verzenden:", error);
            }
        }
    };

    const handleSendReviewLink = async () => {

    };

    return contactId ? (
        <div className='host-chat'>
            <div className="host-chat-screen">
                <div className="host-chat-header">
                    {onBack && (
                        <button className="back-to-contacts-button" onClick={onBack}>
                            <FaArrowLeft />
                        </button>
                    )}
                    <img src={profileImage} alt={contactName} className="profile-img" />
                    <div className="host-chat-header-info">

                        <div className="host-chat-header-grid">
                            <h3>{contactName}</h3>
                            <p>Translation on</p>
                        </div>
                    </div>
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
                    <ChatUploadAttachment onUploadComplete={handleUploadComplete} />

                    <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
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
                        title="Send"
                    >
                        {sending ? 'Sending...' : <FaPaperPlane />}
                    </button>
                </div>

                {sendError && <p className="error-message">{sendError.message}</p>}

            </div>
        </div>
    ) : null;

};


export default HostChatScreen;
