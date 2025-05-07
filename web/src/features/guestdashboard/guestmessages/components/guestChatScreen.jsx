import React, { useEffect, useState, useContext } from 'react';
import GuestChatMessage from './guestChatMessage';
import ChatScreen from '../../../../components/messages/ChatScreen';
import { WebSocketContext } from '../context/webSocketContext';
import { useSendMessage } from '../hooks/useSendMessage';
import '../styles/sass/chatscreen/guestChatScreen.scss';

const GuestChatScreen = ({ userId, contactId, contactName, connectionId, handleContactListMessage, onBack }) => {
    const socket = useContext(WebSocketContext);
    const { sendMessage, sending, error: sendError } = useSendMessage(userId);
    
    return (
        <ChatScreen
            userId={userId}
            contactId={contactId}
            contactName={contactName}
            connectionId={connectionId}
            handleContactListMessage={handleContactListMessage}
            onBack={onBack}
            isHost={false}
            ChatMessageComponent={GuestChatMessage}
            containerClass="guest-chat"
            socket={socket}
            sendMessage={sendMessage}
            sending={sending}
            sendError={sendError}
        />

    );

};

export default GuestChatScreen;