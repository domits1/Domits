import React from 'react';

const ChatMessage = ({ message, userId, contactName }) => {
    const { userId: senderId, text, createdAt, isRead, isSent } = message;

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };

    return (
        <div className={`guest-chat-message ${isRead ? 'read' : 'unread'} ${isSent ? 'sent' : 'received'}`}>
            <div className="guest-message-header">
                <span className="guest-sender-name">{senderId === userId ? 'You' : contactName}</span>
                <span className="guest-message-time">{formatDate(createdAt)}</span>
            </div>
            <div className="guest-message-content">{text}</div>
        </div>
    );
};

export default ChatMessage;
