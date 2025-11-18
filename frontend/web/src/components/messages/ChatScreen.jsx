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
import { toast } from 'react-toastify';
import MessageToast from './MessageToast';


const ChatScreen = ({ userId, contactId, contactName, contactImage, handleContactListMessage, onBack, dashboardType}) => {
    const { messages, loading, error, fetchMessages, addNewMessage } = useFetchMessages(userId);
    const socket = useContext(WebSocketContext);
    const isHost = dashboardType === 'host';
    const { bookingDetails } = isHost
        ? useFetchBookingDetails(userId, contactId)
        : useFetchBookingDetails(contactId, userId);
    const { sendMessage, sending, error: sendError } = useSendMessage(userId);
    const [newMessage, setNewMessage] = useState('');
    const [uploadedFileUrls, setUploadedFileUrls] = useState([]);
    const [messageSearch, setMessageSearch] = useState('');
    const [showPreviewPopover, setShowPreviewPopover] = useState(false);
    const wsMessages = socket?.messages || [];
    const addedMessageIds = useRef(new Set());
    const chatContainerRef = useRef(null);
    const [forceStopLoading, setForceStopLoading] = useState(false);

    const handleUploadComplete = (url) => {
        setUploadedFileUrls((prev) => (!prev.includes(url) ? [...prev, url] : prev));
    };

    useEffect(() => {
        if (contactId) {
            fetchMessages(contactId);
        }
    }, [userId, contactId, fetchMessages]);

    // Safety: if loading persists too long (e.g., network hang), clear after 12s
    useEffect(() => {
        if (!loading) {
            setForceStopLoading(false);
            return;
        }
        const t = setTimeout(() => setForceStopLoading(true), 12000);
        return () => clearTimeout(t);
    }, [loading, contactId]);

    useEffect(() => {
        try {
            const el = chatContainerRef.current;
            if (el) el.scrollTop = el.scrollHeight;
        } catch {}
    }, [messages, contactId]);

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
        automated.forEach((m, i) => {
            addNewMessage(m);
            setTimeout(() => {
                toast.info(
                    <MessageToast 
                        contactName={contactName} 
                        contactImage={contactImage} 
                        message={m.text} 
                    />,
                    { className: 'message-toast-custom' }
                );
            }, i * 200);
        });
        const last = automated[automated.length - 1];
        if (last) {
            // Update contact list preview line
            handleContactListMessage?.({
                ...last,
                recipientId: contactId, // ensure ContactList finds this contact
            });
        }
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
            
            // Show toast for incoming messages (from contact, not from current user)
            if (msg.userId === contactId && msg.recipientId === userId && msg.text) {
                toast.info(
                    <MessageToast 
                        contactName={contactName} 
                        contactImage={contactImage} 
                        message={msg.text} 
                    />,
                    { className: 'message-toast-custom' }
                );
            }
        });
    }, [wsMessages, userId, contactId, addNewMessage, contactName, contactImage]);

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
                    <img src={contactImage || profileImage} alt={contactName} className="profile-img" />
                    <div className="chat-header-info">
                        <h3>{contactName}</h3>
                        <input
                            type="text"
                            value={messageSearch}
                            onChange={(e) => setMessageSearch(e.target.value)}
                            placeholder="Search messages"
                            className="chat-message-search"
                        />
                    </div>
                    <div className="chat-header-actions">
                        <button
                            onClick={handleSendAutomatedTestMessages}
                            className="test-messages-button"
                        >
                            Test messages
                        </button>
                    </div>
                </div>

                <div className="chat-screen" ref={chatContainerRef}>
                    {loading && !forceStopLoading ? (
                        <p>Loading messages...</p>
                    ) : error ? (
                        <p>{String(error)}</p>
                    ) : visibleMessages.length === 0 ? (
                        <p>No messages yet. Say hello 👋</p>
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
                    <div className='attachment-area'>
                        <ChatUploadAttachment onUploadComplete={handleUploadComplete} />
                        {uploadedFileUrls.length > 0 && (
                            <button
                                className='inline-upload-preview'
                                onClick={() => setShowPreviewPopover((s) => !s)}
                                title={uploadedFileUrls.length > 1 ? 'View all previews' : 'View preview'}
                            >
                                <img src={uploadedFileUrls[0]} alt='First attachment preview' />
                                {uploadedFileUrls.length > 1 && (
                                    <span className='more-badge'>+{uploadedFileUrls.length - 1}</span>
                                )}
                            </button>
                        )}
                    </div>
                    <div className='message-input-wrapper'>
                        <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className='message-input-textarea'
                            onKeyUp={(e) => {
                                if (e.key === 'Enter') {
                                    if ((newMessage?.length || 0) <= 200) {
                                        handleSendMessage();
                                    }
                                }
                            }}
                        />
                        {(newMessage?.length || 0) >= 200 && (
                            <div
                                className={`char-counter over`}
                                aria-live="polite"
                            >
                                {newMessage?.length || 0}
                            </div>
                        )}
                        <button
                            onClick={handleSendMessage}
                            className='message-input-send-button'
                            disabled={sending || (newMessage?.length || 0) > 200}
                            title="Send"
                        >
                            <FaPaperPlane />
                        </button>
                    </div>

                    {showPreviewPopover && uploadedFileUrls.length > 0 && (
                        <div className='preview-popover' role='dialog' aria-label='Attachment previews'>
                            <div className='preview-popover-header'>
                                <span>Attachments</span>
                                <button className='close-popover' onClick={() => setShowPreviewPopover(false)} title='Close'>
                                    <FaTimes />
                                </button>
                            </div>
                            <div className='preview-grid'>
                                {uploadedFileUrls.map((url, index) => (
                                    <div className='preview-item' key={`${url}-${index}`}>
                                        <img src={url} alt={`Attachment-${index}`} />
                                        <button
                                            className='remove-thumb'
                                            title='Remove'
                                            onClick={() => setUploadedFileUrls((prev) => prev.filter((u) => u !== url))}
                                        >
                                            <FaTimes />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {sendError && <p className="error-message">{sendError.message}</p>}
            </div>
        </div>
    );
};

export default ChatScreen;
