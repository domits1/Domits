import React, { useEffect, useRef } from 'react';
import profileImage from './domits-logo.jpg';
import './MessageToast.scss';

const AUTO_CLOSE_MS = 5000;

const MessageToast = ({ contactName, contactImage, message, onClose }) => {
    const maxLength = 80;
    const truncatedMessage =
        message && message.length > maxLength
            ? `${message.substring(0, maxLength)}...`
            : message;

    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;
    const isClosable = Boolean(onClose);

    useEffect(() => {
        if (!isClosable) {
            return undefined;
        }
        const timerId = setTimeout(() => onCloseRef.current?.(), AUTO_CLOSE_MS);
        return () => clearTimeout(timerId);
    }, [isClosable, message]);

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
            {isClosable && (
                <button
                    type="button"
                    className="message-toast__close"
                    aria-label="Close notification"
                    onClick={onClose}
                >
                    ✕
                </button>
            )}
        </div>
    );
};

export default MessageToast;
