import { useEffect, useState, useRef, useContext } from 'react';

import useFetchMessages from '../../features/hostdashboard/hostmessages/hooks/useFetchMessages';
import useFetchBookingDetails from '../../features/hostdashboard/hostmessages/hooks/useFetchBookingDetails';
import { useSendMessage } from '../../features/hostdashboard/hostmessages/hooks/useSendMessage';

import ChatMessage from './ChatMessage';
import ChatUploadAttachment from '../../features/hostdashboard/hostmessages/components/chatUploadAttachment';
import { WebSocketContext } from '../../features/hostdashboard/hostmessages/context/webSocketContext';
import '../../features/hostdashboard/hostmessages/styles/sass/chatscreen/hostChatScreen.scss';
import { v4 as uuidv4 } from 'uuid';
import { FaPaperPlane, FaArrowLeft } from 'react-icons/fa';
import profileImage from './domits-logo.jpg';


const ChatScreen = ({ userId, contactId, contactName, handleContactListMessage, onBack, dashboardType}) => {
    const { messages, loading, error, fetchMessages, addNewMessage } = useFetchMessages(userId);
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

            const isNew = !addedMessageIds.current.has(msg.id);

<<<<<<< Updated upstream
            if (isRelevant && isNew) {
                addNewMessage(msg);
                addedMessageIds.current.add(msg.id);
=======
<<<<<<< Updated upstream
            // Skip if we've already added this id
            if (msg.id && addedMessageIds.current.has(msg.id)) return;

            // Skip if this matches an optimistic message we already rendered
=======
            if (msg.id && addedMessageIds.current.has(msg.id)) return;

>>>>>>> Stashed changes
            const incomingSig = `${msg.userId}|${msg.recipientId}|${(msg.text || '').trim()}|${(msg.fileUrls || []).join(',')}`;
            if (optimisticSignaturesRef.current.has(incomingSig)) {
                optimisticSignaturesRef.current.delete(incomingSig);
                return;
>>>>>>> Stashed changes
            }
        });
    }, [wsMessages, userId, contactId]);

    const handleSendMessage = async () => {
<<<<<<< Updated upstream
        if ((newMessage.trim() || uploadedFileUrls.length > 0) && (uploadedFileUrls.length > 0 || newMessage.trim())) {
            try {
=======
        const hasContent = (newMessage.trim() || uploadedFileUrls.length > 0);
        if (!hasContent) return;
        try {
            if (isPairRoom) {
<<<<<<< Updated upstream
                // Local rooms: we handle rendering ourselves and broadcast via BroadcastChannel
=======
>>>>>>> Stashed changes
                const response = local.sendLocalMessage(newMessage, uploadedFileUrls);
                if (!response || !response.success) {
                    alert(`Error while sending: ${response?.error || 'Please try again later.'}`);
                    return;
                }
            } else {
<<<<<<< Updated upstream
                // Remote rooms: send and optimistically render; dedupe when echo arrives
=======
>>>>>>> Stashed changes
>>>>>>> Stashed changes
                const response = await sendMessage(contactId, newMessage, uploadedFileUrls);
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
<<<<<<< Updated upstream
=======
            setNewMessage('');
            setUploadedFileUrls([]);
<<<<<<< Updated upstream
            // Auto-scroll to bottom after sending
=======
>>>>>>> Stashed changes
            try {
                const el = chatContainerRef.current;
                if (el) el.scrollTop = el.scrollHeight;
            } catch {}
        } catch (error) {
            console.error('Unexpected error while sending:', error);
>>>>>>> Stashed changes
        }
    };

    if (!contactId) return null;

<<<<<<< Updated upstream
=======
<<<<<<< Updated upstream
    // Filter messages client-side by keyword (text or file url)
=======
>>>>>>> Stashed changes
    const visibleMessages = messageSearch
        ? messages.filter(m => {
            const text = (m.text || '').toLowerCase();
            const urls = (m.fileUrls || []).join(' ').toLowerCase();
            const term = messageSearch.toLowerCase();
            return text.includes(term) || urls.includes(term);
        })
        : messages;

>>>>>>> Stashed changes
    return (
        <div className={`${dashboardType}-chat`}>
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
<<<<<<< Updated upstream
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
=======
<<<<<<< Updated upstream
                    {/* Hidden uploader kept for functionality */}
=======
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
                        className='whats-action whats-mic'
                        title={newMessage.trim() ? 'Send' : 'Voice'}
                        onClick={() => { if (newMessage.trim()) { handleSendMessage(); } }}
>>>>>>> Stashed changes
                        disabled={sending}
                        title="Send"
                    >
<<<<<<< Updated upstream
                        {sending ? 'Sending...' : <FaPaperPlane />}
=======
                        {newMessage.trim() ? <FaPaperPlane /> : <FaMicrophone />}
=======
                        className='whats-action whats-send'
                        title='Send'
                        onClick={() => { if (newMessage.trim()) { handleSendMessage(); } }}
                        disabled={sending}
                    >
                        <FaPaperPlane />
>>>>>>> Stashed changes
>>>>>>> Stashed changes
                    </button>
                </div>

                {sendError && <p className="error-message">{sendError.message}</p>}
            </div>
        </div>
    );
};

export default ChatScreen;
