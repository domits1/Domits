import React from 'react';

const ChatMessage = ({ message, userId, contactName }) => {
    const { userId: senderId, text, createdAt, isRead, isSent, fileUrls } = message;

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };

    return (
        <div className={`chat-message ${isRead ? 'read' : 'unread'} ${isSent ? 'sent' : 'received'}`}>
            <div className="message-header">
                <span className="sender-name">{senderId === userId ? 'You' : contactName}</span>
                <span className="message-time">{formatDate(createdAt)}</span>
            </div>
            <div className="message-content">{text}</div>
            
            {fileUrls && fileUrls.length > 0 && (
                <div className="message-attachments">
                    {fileUrls.map((fileUrl, index) => (
                        <img key={index} src={fileUrl} alt="Attachment" className="message-image" />
                    ))}
                </div>
            )}
        </div>
    );
};

export default ChatMessage;
