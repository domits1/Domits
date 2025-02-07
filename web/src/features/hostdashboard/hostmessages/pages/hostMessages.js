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
        <div>
            {userId ? (
                <>
                    <ContactList userId={userId} onContactClick={handleContactClick} />
                    <HostChatScreen userId={userId} contactId={selectedContactId} contactName={selectedContactName} />
                </>
            ) : (
                <div>Loading user info...</div>
            )}
            <Pages />
        </div>
    );
};

export default HostMessages;