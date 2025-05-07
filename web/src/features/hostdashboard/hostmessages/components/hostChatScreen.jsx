import React, { useEffect, useState, useContext } from 'react';
import HostChatMessage from './hostChatMessage';
import ChatScreen from '../../../../components/messages/ChatScreen';
import { WebSocketContext } from '../context/webSocketContext';
import { useSendMessage } from '../hooks/useSendMessage';
import '../styles/sass/chatscreen/hostChatScreen.scss';

const HostChatScreen = ({ userId, contactId, contactName, connectionId, handleContactListMessage, onBack }) => {
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
            isHost={true}
            ChatMessageComponent={HostChatMessage}
            containerClass="host-chat"
            socket={socket}
            sendMessage={sendMessage}
            sending={sending}
            sendError={sendError}
        />
    );

};


export default HostChatScreen;
