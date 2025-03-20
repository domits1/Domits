import React, { useEffect, useState } from "react";
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
    const { userId } = useAuth();
    const [selectedContactId, setSelectedContactId] = useState(null);
    const [selectedContactName, setSelectedContactName] = useState(null);
    const { connectionId } = useFetchConnectionId(selectedContactId) || { connectionId: null };
    const [message, setMessage] = useState([]);
    const [screenWidth, setScreenWidth] = useState(window.innerWidth);

    const isMobile = screenWidth < 768;
    const isTablet = screenWidth >= 768 && screenWidth < 1145;
    useEffect(() => {
        const handleResize = () => setScreenWidth(window.innerWidth);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const handleContactClick = (contactId, contactName) => {
        setSelectedContactId(contactId);
        setSelectedContactName(contactName);
    };
    const handleContactListMessage = (sentMessage) => {
        setMessage(sentMessage)
    };

    const handleBackToContacts = () => {
        setSelectedContactId(null);
        setSelectedContactName(null);
    };

    const showContactList =
        isMobile ? !selectedContactId :
            isTablet ? !selectedContactId :
                true;

    const showChatScreen =
        isMobile ? !!selectedContactId :
            isTablet ? !!selectedContactId :
                true;


    return (
        <WebSocketProvider userId={userId}>
            <main className="page-body">
                <h2>Messages</h2>
                {userId ? (
                    <>
                        <div className="host-chat-components">
                            <div className="host-chat-side">
                                <Pages className="host-chat-side" />
                            </div>
                            
                            {showContactList && (
                                <ContactList
                                    userId={userId}
                                    onContactClick={handleContactClick}
                                    message={message}
                                />
                            )}
                            {isMobile && selectedContactId && (
                                <button onClick={handleBackToContacts} className="ContactsBack-button">
                                    ← Back to contacts
                                </button>
                            )}
                            {showChatScreen && (
                                <HostChatScreen
                                    userId={userId}
                                    handleContactListMessage={handleContactListMessage}
                                    contactId={selectedContactId}
                                    connectionId={connectionId}
                                    contactName={selectedContactName}
                                    onBack={isMobile ? handleBackToContacts : null}
                                    onClose={isTablet ? handleBackToContacts : null}
                                />
                            )}
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
