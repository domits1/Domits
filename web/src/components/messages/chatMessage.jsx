import React from 'react';

const ChatMessage = ({ message, userId, contactName, variant = 'default' }) => {
    const { userId: senderId, text, createdAt, isRead, isSent, fileUrls } = message;

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };

    const prefix = variant === 'guest' ? 'guest-' : '';

    return (
        <div className={`${prefix}chat-message ${isRead ? 'read' : 'unread'} ${isSent ? 'sent' : 'received'}`}>
            <div className={`message-header`}>
                <span className={`sender-name`}>
                    {senderId === userId ? 'You' : contactName}
                </span>
                <span className={`message-time`}>{formatDate(createdAt)}</span>
            </div>
            <div className={`message-content`}>{text}</div>

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
                            <img key={index} src={fileUrl} alt="Attachment" className={`message-image`} />
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ChatMessage;
