import React from "react";
import { WebSocketProvider } from "../context/webSocketContext";
import Pages from "../../Pages";
import { UserProvider } from "../context/AuthContext";
import { useAuth } from "../hooks/useAuth";
import HostContactList from "../components/hostContactList";
import HostChatScreen from "../components/hostChatScreen";
import HostBookingTab from "../components/hostBookingTab";
import "../styles/sass/hostMessages.scss";
import Messages from "../../../../components/messages/Messages";

const HostMessages = () => {
    return (
        <UserProvider>
            <HostMessagesContent />
        </UserProvider>
    );
};

const HostMessagesContent = () => {
    const { userId } = useAuth();

    return (
        <WebSocketProvider userId={userId}>
            <Messages
                userId={userId}
                ContactListComponent={HostContactList}
                ChatScreenComponent={HostChatScreen}
                BookingTabComponent={HostBookingTab}
                showPages={true}
                PagesComponent={Pages}
                dashboardType={'host'}
            />
        </WebSocketProvider>
    );
};

export default HostMessages;
