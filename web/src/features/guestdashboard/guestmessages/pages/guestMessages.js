import React from "react";
import { WebSocketProvider } from "../context/webSocketContext";
import { UserProvider } from "../context/AuthContext";
import { useAuth } from "../hooks/useAuth";
import GuestContactList from "../components/guestContactList";
import GuestChatScreen from "../components/guestChatScreen";
import GuestBookingTab from "../components/guestBookingTab";
import "../../../hostdashboard/hostmessages/styles/sass/hostMessages.scss";
import Messages from "../../../../components/messages/Messages";


const GuestMessages = () => {
    return (
        <UserProvider>
            <GuestMessagesContent />
        </UserProvider>
    );
};

const GuestMessagesContent = () => {
    const { userId } = useAuth();

    return (
        <WebSocketProvider userId={userId}>
            <Messages
                userId={userId}
                ContactListComponent={GuestContactList}
                ChatScreenComponent={GuestChatScreen}
                BookingTabComponent={GuestBookingTab}
                dashboardType={'guest'}

            />
        </WebSocketProvider>
    );
};

export default GuestMessages;
