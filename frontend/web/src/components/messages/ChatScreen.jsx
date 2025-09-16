import { useEffect, useState, useRef, useContext } from 'react';

import useFetchMessages from '../../features/hostdashboard/hostmessages/hooks/useFetchMessages';
import useLocalRoomMessages from './hooks/useLocalRoomMessages';
import useFetchBookingDetails from '../../features/hostdashboard/hostmessages/hooks/useFetchBookingDetails';
import { useSendMessage } from '../../features/hostdashboard/hostmessages/hooks/useSendMessage';

import ChatMessage from './ChatMessage';
import ChatUploadAttachment from '../../features/hostdashboard/hostmessages/components/chatUploadAttachment';
import { WebSocketContext } from '../../features/hostdashboard/hostmessages/context/webSocketContext';
import '../../features/hostdashboard/hostmessages/styles/sass/chatscreen/hostChatScreen.scss';
import { v4 as uuidv4 } from 'uuid';
import { FaPaperPlane, FaArrowLeft } from 'react-icons/fa';
import profileImage from './domits-logo.jpg';


const ChatScreen = ({ userId, contactId, contactName, contactAvatar, handleContactListMessage, onBack, dashboardType, testMessages = []}) => {
    const isPairRoom = typeof contactId === 'string' && contactId.startsWith('pair:');
    const roomCode = isPairRoom ? contactId.replace('pair:', '') : null;
    const local = useLocalRoomMessages(roomCode || 'default', userId);
    const remote = useFetchMessages(userId);
    const messages = isPairRoom ? local.messages : [...remote.messages, ...testMessages];
    const loading = isPairRoom ? local.loading : remote.loading;
    const error = isPairRoom ? null : remote.error;
    const fetchMessages = isPairRoom ? (() => {}) : remote.fetchMessages;
    const addNewMessage = isPairRoom ? local.addNewMessage : remote.addNewMessage;
    const socket = useContext(WebSocketContext);
    const isHost = dashboardType === 'host';
    const { bookingDetails } = isHost
        ? useFetchBookingDetails(userId, contactId)
        : useFetchBookingDetails(contactId, userId);
    const { sendMessage, sending, error: sendError } = useSendMessage(userId);
    const [newMessage, setNewMessage] = useState('');
    const [uploadedFileUrls, setUploadedFileUrls] = useState([]);
    const wsMessages = socket?.messages || [];
    const addedMessageIds = useRef(new Set());

    const handleUploadComplete = (url) => {
        setUploadedFileUrls((prev) => (!prev.includes(url) ? [...prev, url] : prev));
    };

    useEffect(() => {
        if (contactId) {
            fetchMessages(contactId);
        }
    }, [userId, contactId, fetchMessages]);

    const handleSendAutomatedTestMessages = () => {
        if (!contactId) return;

        const automated = [
            {
                id: uuidv4(),
                userId: contactId, // from other side
                recipientId: userId, // to me
                text: `👋 Welcome! Thanks for booking. I'm here to help with anything you need.`,
                createdAt: new Date().toISOString(),
                isSent: false,
                isAutomated: true,
                messageType: 'host_property_welcome',
            },
            {
                id: uuidv4(),
                userId: contactId, // from other side
                recipientId: userId, // to me
                text: `📍 Check-in is flexible. Share your ETA and I’ll prepare accordingly.`,
                createdAt: new Date(Date.now() + 500).toISOString(),
                isSent: false,
                isAutomated: true,
                messageType: 'checkin_instructions',
            },
            {
                id: uuidv4(),
                userId: contactId, // from other side
                recipientId: userId, // to me
                text: `📶 Wi‑Fi details will be in the guidebook on arrival.`,
                createdAt: new Date(Date.now() + 1000).toISOString(),
                isSent: false,
                isAutomated: true,
                messageType: 'wifi_info',
            },
        ];

        automated.forEach((m) => addNewMessage(m));
    };

    useEffect(() => {
        wsMessages.forEach((msg) => {
            const isRelevant =
                (msg.userId === userId && msg.recipientId === contactId) ||
                (msg.userId === contactId && msg.recipientId === userId);

            const isNew = !addedMessageIds.current.has(msg.id);

            if (isRelevant && isNew) {
                // Add visual indicator for automated messages
                const messageWithIndicator = {
                    ...msg,
                    isAutomated: msg.isAutomated || false,
                    messageType: msg.messageType || 'regular'
                };

                addNewMessage(messageWithIndicator);
                addedMessageIds.current.add(msg.id);

                // Log automated messages for debugging
                if (msg.isAutomated) {
                    console.log('🤖 Automated message received:', {
                        type: msg.messageType,
                        from: msg.userId,
                        to: msg.recipientId,
                        text: msg.text?.substring(0, 50) + '...'
                    });
                }
            }
        });
    }, [wsMessages, userId, contactId]);

    const handleSendMessage = async () => {
        if ((newMessage.trim() || uploadedFileUrls.length > 0) && (uploadedFileUrls.length > 0 || newMessage.trim())) {
            try {
                const response = isPairRoom
                    ? local.sendLocalMessage(newMessage, uploadedFileUrls)
                    : await sendMessage(contactId, newMessage, uploadedFileUrls);
                if (!response || !response.success) {
                    alert(`Error while sending: ${response.error || 'Please try again later.'}`);
                    return;
                }
                // only for UI
                const tempSentMessage = {
                    id: uuidv4(),
                    userId,
                    recipientId: contactId,
                    text: newMessage,
                    fileUrls: uploadedFileUrls,
                    createdAt: new Date().toISOString(),
                    isSent: true,
                };

                handleContactListMessage(tempSentMessage);
                addNewMessage(tempSentMessage);
                setNewMessage('');
                setUploadedFileUrls([]);
            } catch (error) {
                console.error('Unexpected error while sending:', error);
            }
        }
    };

    if (!contactId) return null;

    return (
        <div className={`${dashboardType}-chat`}>
            <div className="chat-screen-container">
                <div className="chat-header">
                    {onBack && (
                        <button className="back-to-contacts-button" onClick={onBack}>
                            <FaArrowLeft />
                        </button>
                    )}
                    <img src={contactAvatar || profileImage} alt={contactName} className="profile-img" />
                    <div className="chat-header-info">
                        <h3>{contactName}</h3>
                        <p>Translation on</p>
                    </div>
                    <div className="chat-header-actions">
                        <button
                            type="button"
                            className="automated-test-button"
                            onClick={handleSendAutomatedTestMessages}
                            title="Send automated test messages"
                        >
                            🤖 Test messages
                        </button>
                    </div>
                </div>

                <div className="chat-screen">
                    {loading ? (
                        <div className="loading-messages">
                            <div className="loading-spinner"></div>
                            <p>Loading messages...</p>
                        </div>
                    ) : error ? (
                        <div className="error-message">
                            <p>⚠️ {error}</p>
                            <button onClick={() => fetchMessages(contactId)} className="retry-button">
                                Retry
                            </button>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="empty-chat">
                            <p>👋 Start a conversation with {contactName}</p>
                            <p className="empty-chat-subtitle">Send your first message below</p>
                        </div>
                    ) : (
                        messages.map((message) => (
                            <ChatMessage
                                key={message.id}
                                message={message}
                                userId={userId}
                                contactName={contactName}
                                dashboardType={dashboardType}
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
