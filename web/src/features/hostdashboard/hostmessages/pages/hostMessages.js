import React, { useEffect, useState, useRef } from "react";
import { API, graphqlOperation } from "aws-amplify";
import { withAuthenticator } from "@aws-amplify/ui-react";
import Pages from "../../Pages";
import { Auth } from 'aws-amplify';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserProvider } from "../context/AuthContext";
import { useAuth } from "../hooks/useAuth";
import ContactList from "../components/hostContactList";
import HostChatScreen from "../components/hostChatScreen";
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

    const handleContactClick = (contactId, contactName) => {
        console.log('Contact ID:', contactId);
        setSelectedContactId(contactId);
        setSelectedContactName(contactName);
    };

    return (

        <main className="page-body">
            <h2>Messages</h2>

            {userId ? (
                <>
                    <div className="host-chat-components">
                        <Pages />

                        <ContactList userId={userId} onContactClick={handleContactClick} />
                        <HostChatScreen userId={userId} contactId={selectedContactId} contactName={selectedContactName} />
                    </div>
                </>
            ) : (
                <div>Loading user info...</div>
            )}
        </main>
    );
};

export default HostMessages;