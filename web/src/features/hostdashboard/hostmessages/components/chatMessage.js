import React from 'react';
// import '../styles/chatMessage.css'; 

const ChatMessage = ({ message, userId, contactName }) => {
    const { userId: senderId, text, createdAt, isRead, isSent } = message;
    // console.log(message)

    // Format the date to display it properly
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return `${date.getHours()}:${date.getMinutes()} ${date.toDateString()}`;
    };

    return (
        <div className={`chat-message ${isRead ? 'read' : 'unread'} ${isSent ? 'sent' : 'received'}`}>
            <div className="message-header">
                <span className="sender-name">{senderId === userId ? 'You' : contactName}</span>
                <span className="message-time">{formatDate(createdAt)}</span>
            </div>
            <div className="message-content">{text}</div>
        </div>
    );
};

export default ChatMessage;
