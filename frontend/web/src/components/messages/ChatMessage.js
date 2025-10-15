import React, { useState } from 'react';
import Icon from '@mdi/react';
import {
    mdiPartyPopper,
    mdiClipboardTextOutline, 
    mdiDoor, 
    mdiWifi, 
    mdiStarOutline, 
    mdiRobotOutline 
} from '@mdi/js';

const ChatMessage = ({ message, userId, contactName, dashboardType }) => {
    const { userId: senderId, text, createdAt, isRead, isSent, fileUrls, isAutomated, messageType } = message;
    const variant = dashboardType;

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };

    const prefix = variant === 'guest' ? 'guest-' : '';

    // Determine direction: prefer actual sender vs current user, fall back to legacy isSent flag
    const isOutgoingBySender = senderId ? senderId === userId : null;
    const isOutgoing = (isOutgoingBySender !== null) ? isOutgoingBySender : !!isSent;
    const directionClass = isOutgoing ? 'sent' : 'received';

    const [modalImage, setModalImage] = useState(null);

    // Automated message styling
    const isAutomatedMessage = isAutomated === true;
    const automatedIcon = isAutomatedMessage ? getAutomatedIcon(messageType) : null;

    function getAutomatedIcon(type) {
        switch (type) {
            case 'booking_confirmation': return mdiPartyPopper;
            case 'checkin_instructions': return mdiClipboardTextOutline;
            case 'checkout_instructions': return mdiDoor;
            case 'wifi_info': return mdiWifi;
            case 'feedback_request': return mdiStarOutline;
            default: return mdiRobotOutline;
        }
    }

    return (
        <div className={`${prefix}chat-message-container ${isAutomatedMessage ? 'automated-message' : ''}`}>
            <div className={`${prefix}chat-message ${isRead ? 'read' : 'unread'} ${directionClass} ${isAutomatedMessage ? 'automated' : ''}`}>
                <div className={`message-header ${isAutomatedMessage ? 'automated-header' : ''}`}>
                    {isAutomatedMessage && (
                        <span className={`sender-name`}>
                            <span className="automated-sender" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Icon path={automatedIcon} size={0.8} aria-label="automated-icon" /> {senderId === userId ? 'You' : contactName} (Automated)
                            </span>
                        </span>
                    )}
                    <span className={`message-time ${isAutomatedMessage ? 'automated-time' : ''}`}>{formatDate(createdAt)}</span>
                </div>
                <div className={`message-content ${isAutomatedMessage ? 'automated-content' : ''}`}>
                    <span className="message-text">{text}</span>
                </div>

                {fileUrls?.length > 0 && (
                    <div className={`message-attachments`}>
                        {fileUrls.map((fileUrl, index) => {
                            const isVideo = fileUrl.endsWith('.mp4');
                            return isVideo ? (
                                <video key={index} controls className={`message-video`}>
                                    <source src={fileUrl} type="video/mp4" />
                                    Your browser does not support the video tag.
                                </video>
                            ) : (
                                <img key={index} src={fileUrl} alt="Attachment" className={`message-image`} onClick={() => setModalImage(fileUrl)}
                                    style={{ cursor: 'pointer' }} />
                            );
                        })}
                    </div>
                )}
            </div>
            {modalImage && (
                <div
                    className="image-modal"
                    onClick={() => setModalImage(null)}
                >
                    <img src={modalImage} alt="Enlarged attachment" className="image-modal-content" />
                </div>
            )}
        </div>
    );
};

export default ChatMessage;
