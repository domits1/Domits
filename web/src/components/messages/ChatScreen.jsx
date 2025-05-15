import React, { useEffect, useState } from 'react';
import useFetchMessages from '../../features/hostdashboard/hostmessages/hooks/useFetchMessages';
import useFetchBookingDetails from '../../features/hostdashboard/hostmessages/hooks/useFetchBookingDetails';
import ChatUploadAttachment from '../../features/hostdashboard/hostmessages/components/chatUploadAttachment';
import { v4 as uuidv4 } from 'uuid';
import { FaPaperPlane, FaArrowLeft } from 'react-icons/fa';
import profileImage from '../../features/hostdashboard/hostmessages/domits-logo.jpg';

const ChatScreen = ({
    userId,
    contactId,
    contactName,
    handleContactListMessage,
    onBack,
    isHost = true,
    ChatMessageComponent,
    containerClass = '',
    socket,
    sendMessage,
    sending,
    sendError,
}) => {
    const { messages, loading, error, fetchMessages, addNewMessage } = useFetchMessages(userId);
    const { bookingDetails } = isHost
        ? useFetchBookingDetails(userId, contactId)
        : useFetchBookingDetails(contactId, userId);
    const [newMessage, setNewMessage] = useState('');
    const [uploadedFileUrls, setUploadedFileUrls] = useState([]);
    const wsMessages = socket?.messages || [];



    const handleUploadComplete = (url) => {
        setUploadedFileUrls((prev) => (!prev.includes(url) ? [...prev, url] : prev));
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
                const response = await sendMessage(contactId, newMessage, uploadedFileUrls);
                if (!response || !response.success) {
                    alert(`Fout bij verzenden: ${response.error || 'Probeer het later opnieuw.'}`);
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
                console.error('Onverwachte fout bij verzenden:', error);
            }
        }
    };

    if (!contactId) return null;

    return (
        <div className={containerClass}>
            <div className="chat-screen-container">
                <div className="chat-header">
                    {onBack && (
                        <button className="back-to-contacts-button" onClick={onBack}>
                            <FaArrowLeft />
                        </button>
                    )}
                    <img src={profileImage} alt={contactName} className="profile-img" />
                    <div className="chat-header-info">
                        <h3>{contactName}</h3>
                        <p>Translation on</p>
                    </div>
                </div>

                <div className="chat-screen">
                    {loading ? (
                        <p>Loading messages...</p>
                    ) : error ? (
                        <p>{error}</p>
                    ) : (
                        messages.map((message) => (
                            <ChatMessageComponent
                                key={message.id}
                                message={message}
                                userId={userId}
                                contactName={contactName}
                            />
                        ))
                    )}
                </div>

                <div className='chat-input'>
                    <ChatUploadAttachment onUploadComplete={handleUploadComplete} />
                    <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className='message-input-textarea'
                        onKeyUp={(e) => {
                            if (e.key === 'Enter') handleSendMessage();
                        }}
                    />
                    <button
                        onClick={handleSendMessage}
                        className='message-input-send-button'
                        disabled={sending}
                        title="Send"
                    >
                        {sending ? 'Sending...' : <FaPaperPlane />}
                    </button>
                </div>

                {sendError && <p className="error-message">{sendError.message}</p>}
            </div>
        </div>
    );
};

export default ChatScreen;
