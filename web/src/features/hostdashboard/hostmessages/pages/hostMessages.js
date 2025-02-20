import React, { useEffect, useState, useRef } from "react";
import { WebSocketProvider } from "../context/webSocketContext";
import Pages from "../../Pages";
import { UserProvider } from "../context/AuthContext";
import { useAuth } from "../hooks/useAuth";
import ContactList from "../components/hostContactList";
import HostChatScreen from "../components/hostChatScreen";
import useFetchConnectionId from '../hooks/useFetchConnectionId';
import "../styles/hostMessages.css";

const HostMessages = () => {
    return (
        <UserProvider>
            <HostMessagesContent />
        </UserProvider>
    );
};

const HostMessagesContent = () => {
    const { userId, token } = useAuth();
    const [selectedContactId, setSelectedContactId] = useState(null);
    const [selectedContactName, setSelectedContactName] = useState(null);
    const { connectionId } = useFetchConnectionId(selectedContactId) || { connectionId: null };
    useEffect(() => {
        if (connectionId) {
            console.log("Connection ID:", connectionId);
        }
    }, [connectionId]);

    const handleContactClick = (contactId, contactName) => {
        setSelectedContactId(contactId);
        setSelectedContactName(contactName);
    };

    return (
        <WebSocketProvider userId={userId} token={token}>
            <main className="page-body">

                {userId ? (
                    <>
                        <div className="host-chat-components">
                            <Pages />

                            <ContactList userId={userId} onContactClick={handleContactClick} />
                            <HostChatScreen userId={userId} contactId={selectedContactId} connectionId={connectionId} contactName={selectedContactName} />
                        </div>
                    </>
                ) : (
                    <div>Loading user info...</div>
                )}
            </main>
        </WebSocketProvider>
    );
};

export default HostMessages;