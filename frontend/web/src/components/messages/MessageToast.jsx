import React from 'react';
import profileImage from './domits-logo.jpg';
import './MessageToast.scss';

const MessageToast = ({ contactName, contactImage, message }) => {
    const maxLength = 80;
    const truncatedMessage =
        message && message.length > maxLength
            ? `${message.substring(0, maxLength)}...`
            : message;

    return (
        <div className="message-toast">
            <img
                className="message-toast__avatar"
                src={contactImage || profileImage}
                alt={contactName || 'Contact'}
            />
            <div className="message-toast__content">
                <div className="message-toast__name">
                    {contactName || 'Contact'}
                </div>
                <div className="message-toast__body">
                    {truncatedMessage}
                </div>
            </div>
        </div>
    );
};

export default MessageToast;

