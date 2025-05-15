import React from 'react';
import ChatMessage from '../../../../components/messages/chatMessage';

const GuestChatMessage = ({ message, userId, contactName }) => {
    return (
        <ChatMessage
        message={message}
        userId={userId}
        contactName={contactName}
        variant="guest"
    />
    );
};

export default GuestChatMessage;
