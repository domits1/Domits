import React, { useContext } from 'react';
import GuestChatMessage from './guestChatMessage';
import ChatScreen from '../../../../components/messages/ChatScreen';
import { WebSocketContext } from "../../../hostdashboard/hostmessages/context/webSocketContext";
import '../../../hostdashboard/hostmessages/styles/sass/chatscreen/hostChatScreen.scss';

const GuestChatScreen = ({ userId, contactId, contactName, handleContactListMessage, onBack }) => {
    const socket = useContext(WebSocketContext);
    
    return (
        <ChatScreen
            userId={userId}
            contactId={contactId}
            contactName={contactName}
            handleContactListMessage={handleContactListMessage}
            onBack={onBack}
            isHost={false}
            ChatMessageComponent={GuestChatMessage}
            containerClass="guest-chat"
            socket={socket}
        />

    );

};

export default GuestChatScreen;