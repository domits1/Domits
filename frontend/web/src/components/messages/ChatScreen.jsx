import { useEffect, useState, useRef, useContext } from 'react';

import useFetchMessages from '../../features/hostdashboard/hostmessages/hooks/useFetchMessages';
import useFetchBookingDetails from '../../features/hostdashboard/hostmessages/hooks/useFetchBookingDetails';
import { useSendMessage } from '../../features/hostdashboard/hostmessages/hooks/useSendMessage';

import ChatMessage from './ChatMessage';
import ChatUploadAttachment from '../../features/hostdashboard/hostmessages/components/chatUploadAttachment';
import { WebSocketContext } from '../../features/hostdashboard/hostmessages/context/webSocketContext';
import '../../features/hostdashboard/hostmessages/styles/sass/chatscreen/hostChatScreen.scss';
import { v4 as uuidv4 } from 'uuid';
import { FaPaperPlane, FaArrowLeft, FaTimes } from 'react-icons/fa';
import profileImage from './domits-logo.jpg';


const ChatScreen = ({ userId, contactId, contactName, contactImage, handleContactListMessage, onBack, onClose, dashboardType}) => {
    const { messages, loading, error, fetchMessages, addNewMessage, hasMore, loadOlder } = useFetchMessages(userId);
    const socket = useContext(WebSocketContext);
    const isHost = dashboardType === 'host';
    const { bookingDetails } = isHost
        ? useFetchBookingDetails(userId, contactId)
        : useFetchBookingDetails(contactId, userId);
    const { sendMessage, sending, error: sendError } = useSendMessage(userId);
    const [newMessage, setNewMessage] = useState('');
    const [uploadedFileUrls, setUploadedFileUrls] = useState([]);
    const [messageSearch, setMessageSearch] = useState('');
    const wsMessages = socket?.messages || [];
    const addedMessageIds = useRef(new Set());
    const chatContainerRef = useRef(null);

    const handleUploadComplete = (url) => {
        setUploadedFileUrls((prev) => (!prev.includes(url) ? [...prev, url] : prev));
    };

    useEffect(() => {
        if (contactId) {
            // Force a quick refresh when entering a chat to sync cache with backend
            fetchMessages(contactId, { force: true });
        }
    }, [userId, contactId, fetchMessages]);

    useEffect(() => {
        try {
            const el = chatContainerRef.current;
            if (el) el.scrollTop = el.scrollHeight;
        } catch {}
    }, [messages, contactId]);

    useEffect(() => {
        const el = chatContainerRef.current;
        if (!el) return;
        const onScroll = () => {
            if (el.scrollTop <= 0 && hasMore) {
                loadOlder();
            }
        };
        el.addEventListener('scroll', onScroll);
        return () => el.removeEventListener('scroll', onScroll);
    }, [hasMore, loadOlder]);

    // No search UI in this simplified version

    const handleSendAutomatedTestMessages = () => {
        if (!contactId) return;
        const baseTime = Date.now();
        const automated = [
            {
                id: `auto-${uuidv4()}`,
                userId: contactId,
                recipientId: userId,
                text: `👋 Welcome! Thanks for booking. I'm here to help with anything you need.`,
                createdAt: new Date(baseTime).toISOString(),
                isSent: false,
                isAutomated: true,
                messageType: 'host_property_welcome',
            },
            {
                id: `auto-${uuidv4()}`,
                userId: contactId,
                recipientId: userId,
                text: `📍 Check-in is flexible. Share your ETA and I’ll prepare accordingly.`,
                createdAt: new Date(baseTime + 500).toISOString(),
                isSent: false,
                isAutomated: true,
                messageType: 'checkin_instructions',
            },
            {
                id: `auto-${uuidv4()}`,
                userId: contactId,
                recipientId: userId,
                text: `📶 Wi‑Fi details will be in the guidebook on arrival.`,
                createdAt: new Date(baseTime + 1000).toISOString(),
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

            if (!isRelevant || !msg?.id) return;
            if (addedMessageIds.current.has(msg.id)) return;

            addNewMessage(msg);
            addedMessageIds.current.add(msg.id);
        });
    }, [wsMessages, userId, contactId, addNewMessage]);

    const handleSendMessage = async () => {
        const hasContent = (newMessage.trim() || uploadedFileUrls.length > 0);
        if (!hasContent) return;
        try {
            const response = await sendMessage(contactId, newMessage, uploadedFileUrls);
            if (!response || !response.success) {
                alert(`Error while sending: ${response?.error || 'Please try again later.'}`);
                return;
            }

            const tempSentMessage = {
                id: uuidv4(),
                userId,
                recipientId: contactId,
                text: newMessage,
                fileUrls: uploadedFileUrls,
                createdAt: new Date().toISOString(),
                isSent: true,
            };

            addNewMessage(tempSentMessage);
            handleContactListMessage?.(tempSentMessage);
            setNewMessage('');
            setUploadedFileUrls([]);

            try {
                const el = chatContainerRef.current;
                if (el) el.scrollTop = el.scrollHeight;
            } catch {}
        } catch (error) {
            console.error('Unexpected error while sending:', error);
        }
    };

    if (!contactId) return null;

    const visibleMessages = messageSearch
        ? messages.filter((m) => {
            const text = (m.text || '').toLowerCase();
            const urls = (m.fileUrls || []).join(' ').toLowerCase();
            const term = messageSearch.toLowerCase();
            return text.includes(term) || urls.includes(term);
        })
        : messages;
    return (
        <div className={`${dashboardType}-chat`}>
            <div className="chat-screen-container">
                <div className="chat-header">
                    {onBack && (
                        <button className="back-to-contacts-button" onClick={onBack}>
                            <FaArrowLeft />
                        </button>
                    )}
                    {onClose && (
                        <button 
                            className="close-chat-button" 
                            onClick={onClose}
                            title="Close chat"
                            style={{
                                background: 'none',
                                border: 'none',
                                fontSize: '16px',
                                color: '#666',
                                cursor: 'pointer',
                                padding: '4px',
                                marginRight: '8px',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.color = '#333';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.color = '#666';
                            }}
                        >
                            <FaTimes />
                        </button>
                    )}
                    <img src={contactImage || profileImage} alt={contactName} className="profile-img" />
                    <div className="chat-header-info">
                        <h3>{contactName}</h3>
                        <p>Translation on</p>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', paddingRight: '1rem' }}>
                        <input
                            type="text"
                            value={messageSearch}
                            onChange={(e) => setMessageSearch(e.target.value)}
                            placeholder="Search messages"
                            style={{
                                border: '1px solid #ccc',
                                background: '#fff',
                                borderRadius: '6px',
                                padding: '6px 10px',
                                minWidth: '180px'
                            }}
                        />
                        <button
                            onClick={handleSendAutomatedTestMessages}
                            style={{
                                border: '1px solid #ccc',
                                background: '#f3f3f3',
                                borderRadius: '6px',
                                padding: '6px 10px',
                                cursor: 'pointer'
                            }}
                        >
                            Test messages
                        </button>
                    </div>
                </div>

                <div className="chat-screen" ref={chatContainerRef}>
                    {loading ? (
                        <p>Loading messages...</p>
                    ) : error ? (
                        <p>{error}</p>
                    ) : (
                        visibleMessages.map((message) => (
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
                    <div className='message-input-wrapper'>
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
                            <FaPaperPlane />
                        </button>
                    </div>
                </div>

                {sendError && <p className="error-message">{sendError.message}</p>}
            </div>
        </div>
    );
};

export default ChatScreen;
