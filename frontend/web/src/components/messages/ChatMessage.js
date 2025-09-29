import React, { useState } from 'react';

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
            case 'booking_confirmation': return '🎉';
            case 'checkin_instructions': return '📋';
            case 'checkout_instructions': return '🚪';
            case 'wifi_info': return '📶';
            case 'feedback_request': return '⭐';
            default: return '🤖';
        }
    }

    return (
        <div className={`${prefix}chat-message-container ${isAutomatedMessage ? 'automated-message' : ''}`}>
            <div className={`${prefix}chat-message ${isRead ? 'read' : 'unread'} ${directionClass} ${isAutomatedMessage ? 'automated' : ''}`}>
                <div className={`message-header ${isAutomatedMessage ? 'automated-header' : ''}`}>
                    {isAutomatedMessage && (
                        <span className={`sender-name`}>
                            <span className="automated-sender">
                                {automatedIcon} {senderId === userId ? 'You' : contactName} (Automated)
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
