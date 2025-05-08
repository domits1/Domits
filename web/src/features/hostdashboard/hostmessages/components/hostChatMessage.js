import React from 'react';
import ChatMessage from '../../../../components/messages/chatMessage';

const HostChatMessage = ({ message, userId, contactName }) => {

    return (
        <ChatMessage
            message={message}
            userId={userId}
            contactName={contactName}
            variant="host"
        />
    );
};

export default HostChatMessage;
