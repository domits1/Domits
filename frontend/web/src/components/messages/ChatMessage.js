import React, { useState } from 'react';

const ChatMessage = ({ message, userId, contactName, dashboardType }) => {
    const { userId: senderId, text, createdAt, isRead, isSent, fileUrls } = message;
    const variant = dashboardType;

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };

    const prefix = variant === 'guest' ? 'guest-' : '';

    const [modalImage, setModalImage] = useState(null);

    return (
        <div className={`${prefix}chat-message-container`}>
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
