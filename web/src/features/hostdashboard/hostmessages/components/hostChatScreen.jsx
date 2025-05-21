import React, { useContext } from 'react';
import HostChatMessage from './hostChatMessage';
import ChatScreen from '../../../../components/messages/ChatScreen';
import { WebSocketContext } from '../context/webSocketContext';
import '../styles/sass/chatscreen/hostChatScreen.scss';

const HostChatScreen = ({ userId, contactId, contactName, handleContactListMessage, onBack }) => {
    const socket = useContext(WebSocketContext);
    
    return (
        <ChatScreen
            userId={userId}
            contactId={contactId}
            contactName={contactName}
            handleContactListMessage={handleContactListMessage}
            onBack={onBack}
            isHost={true}
            ChatMessageComponent={HostChatMessage}
            containerClass="host-chat"
            socket={socket}
        />
    );

};


export default HostChatScreen;
