import React, { useEffect, useState, useRef } from "react";
import { API, graphqlOperation } from "aws-amplify";
import { withAuthenticator } from "@aws-amplify/ui-react";
import Pages from "../../Pages";
import { Auth } from 'aws-amplify';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserProvider } from "../context/AuthContext";
import { useAuth } from "../hooks/useAuth";
import ContactList from "../components/hostContactList";

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
        <div>
            {userId ? (
                <>
                    {/* <div>Welcome, user {userId}!</div> */}
                    {/* Contact List Component */}
                    <ContactList userId={userId} />
                </>
            ) : (
                <div>Loading user info...</div>
            )}
            <Pages />
        </div>
    );
};

export default HostMessages;