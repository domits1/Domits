import React, { useContext } from 'react';
import GuestChatMessage from './guestChatMessage';
import ChatScreen from '../../../../components/messages/ChatScreen';
import { WebSocketContext } from '../context/webSocketContext';
import { useSendMessage } from '../hooks/useSendMessage';
import '../../../hostdashboard/hostmessages/styles/sass/chatscreen/hostChatScreen.scss';

const GuestChatScreen = ({ userId, contactId, contactName, handleContactListMessage, onBack }) => {
    const socket = useContext(WebSocketContext);
    const { sendMessage, sending, error: sendError } = useSendMessage(userId);
    
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
            sendMessage={sendMessage}
            sending={sending}
            sendError={sendError}
        />

    );

};

export default GuestChatScreen;