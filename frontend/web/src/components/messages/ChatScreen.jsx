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
import { FaPaperPlane, FaArrowLeft, FaSearch, FaTimes, FaPaperclip, FaMicrophone } from 'react-icons/fa';
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
    const [messageSearch, setMessageSearch] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const searchInputRef = useRef(null);
    const addedMessageIds = useRef(new Set());
    const optimisticSignaturesRef = useRef(new Set());
    const chatContainerRef = useRef(null);

    const handleUploadComplete = (url) => {
        setUploadedFileUrls((prev) => (!prev.includes(url) ? [...prev, url] : prev));
    };

    const handleOpenAttachmentPicker = () => {
        try {
            const input = document.getElementById('fileInput');
            input?.click();
        } catch {}
    };

    useEffect(() => {
        if (contactId) {
            fetchMessages(contactId);
        }
    }, [userId, contactId, fetchMessages]);

    // Scroll to bottom on new messages or when conversation changes
    useEffect(() => {
        try {
            const el = chatContainerRef.current;
            if (el) el.scrollTop = el.scrollHeight;
        } catch {}
    }, [messages, contactId]);

    useEffect(() => {
        if (isSearchOpen) {
            try {
                searchInputRef.current?.focus();
            } catch {}
        }
    }, [isSearchOpen]);

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

            if (!isRelevant) return;

            // Skip if we've already added this id
            if (msg.id && addedMessageIds.current.has(msg.id)) return;

            // Skip if this matches an optimistic message we already rendered
            const incomingSig = `${msg.userId}|${msg.recipientId}|${(msg.text || '').trim()}|${(msg.fileUrls || []).join(',')}`;
            if (optimisticSignaturesRef.current.has(incomingSig)) {
                optimisticSignaturesRef.current.delete(incomingSig);
                return;
            }

            const messageWithDefaults = {
                ...msg,
                isAutomated: msg.isAutomated || false,
                messageType: msg.messageType || 'regular'
            };

            addNewMessage(messageWithDefaults);
            if (msg.id) addedMessageIds.current.add(msg.id);

            // Consider surfacing automated message events in UI/analytics later
        });
    }, [wsMessages, userId, contactId, addNewMessage]);

    const makeSignature = (m) => `${m.userId}|${m.recipientId}|${(m.text || '').trim()}|${(m.fileUrls || []).join(',')}`;

    const handleSendMessage = async () => {
        const hasContent = (newMessage.trim() || uploadedFileUrls.length > 0);
        if (!hasContent) return;
        try {
            if (isPairRoom) {
                // Local rooms: we handle rendering ourselves and broadcast via BroadcastChannel
                const response = local.sendLocalMessage(newMessage, uploadedFileUrls);
                if (!response || !response.success) {
                    alert(`Error while sending: ${response?.error || 'Please try again later.'}`);
                    return;
                }
            } else {
                // Remote rooms: send and optimistically render; dedupe when echo arrives
                const response = await sendMessage(contactId, newMessage, uploadedFileUrls);
                if (!response || !response.success) {
                    alert(`Error while sending: ${response.error || 'Please try again later.'}`);
                    return;
                }

                const tempSentMessage = {
                    id: `temp-${uuidv4()}`,
                    userId,
                    recipientId: contactId,
                    text: newMessage,
                    fileUrls: uploadedFileUrls,
                    createdAt: new Date().toISOString(),
                    isSent: true,
                };
                optimisticSignaturesRef.current.add(makeSignature(tempSentMessage));
                addNewMessage(tempSentMessage);
                handleContactListMessage?.(tempSentMessage);
            }
            setNewMessage('');
            setUploadedFileUrls([]);
            // Auto-scroll to bottom after sending
            try {
                const el = chatContainerRef.current;
                if (el) el.scrollTop = el.scrollHeight;
            } catch {}
        } catch (error) {
            console.error('Unexpected error while sending:', error);
        }
    };

    if (!contactId) return null;

    // Filter messages client-side by keyword (text or file url)
    const visibleMessages = messageSearch
        ? messages.filter(m => {
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
                    <div className="chat-header-left-actions">
                        <button
                            type="button"
                            className="automated-test-button"
                            onClick={handleSendAutomatedTestMessages}
                            title="Send automated test messages"
                        >
                            🤖 Test messages
                        </button>
                    </div>
                    <img src={contactAvatar || profileImage} alt={contactName} className="profile-img" />
                    <div className="chat-header-info">
                        <h3>{contactName}</h3>
                        <p>Translation on</p>
                    </div>
                    <div className="chat-header-actions">
                        <div className="chat-header-search">
                            {!isSearchOpen ? (
                                <button
                                    type="button"
                                    className="chat-header-search-toggle"
                                    onClick={() => setIsSearchOpen(true)}
                                    title="Search messages"
                                    aria-label="Search messages"
                                >
                                    <FaSearch />
                                </button>
                            ) : (
                                <div className="chat-header-search-expanded">
                                    <FaSearch className="chat-header-search-icon" />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        placeholder="Search messages"
                                        value={messageSearch}
                                        onChange={(e) => setMessageSearch(e.target.value)}
                                        className="chat-header-search-input"
                                    />
                                    <button
                                        type="button"
                                        className="chat-header-search-close"
                                        onClick={() => { setIsSearchOpen(false); setMessageSearch(''); }}
                                        title="Close search"
                                    >
                                        <FaTimes />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>


                <div className="chat-screen" ref={chatContainerRef}>
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
                    ) : visibleMessages.length === 0 ? (
                        <div className="empty-chat">
                            {messageSearch ? (
                                <>
                                    <p>No messages match your search.</p>
                                    <p className="empty-chat-subtitle">Try different keywords</p>
                                </>
                            ) : (
                                <>
                                    <p>👋 Start a conversation with {contactName}</p>
                                    <p className="empty-chat-subtitle">Send your first message below</p>
                                </>
                            )}
                        </div>
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
                    {/* Hidden uploader kept for functionality */}
                    <div style={{ display: 'none' }}>
                        <ChatUploadAttachment onUploadComplete={handleUploadComplete} />
                    </div>

                    <button className='whats-action whats-clip' title='Attach' onClick={handleOpenAttachmentPicker}>
                        <FaPaperclip />
                    </button>

                    <div className='whats-input'>
                        <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Message"
                            className='whats-textarea'
                            onKeyUp={(e) => {
                                if (e.key === 'Enter') handleSendMessage();
                            }}
                        />
                    </div>

                    <button
                        className='whats-action whats-mic'
                        title={newMessage.trim() ? 'Send' : 'Voice'}
                        onClick={() => { if (newMessage.trim()) { handleSendMessage(); } }}
                        disabled={sending}
                    >
                        {newMessage.trim() ? <FaPaperPlane /> : <FaMicrophone />}
                    </button>
                </div>

                {sendError && <p className="error-message">{sendError.message}</p>}
            </div>
        </div>
    );
};

export default ChatScreen;
