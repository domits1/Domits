import React, { useState, useEffect, useContext } from 'react';
import useFetchContacts from '../hooks/useFetchContacts';
import HostContactItem from './hostContactItem';
import { WebSocketContext } from '../context/webSocketContext';
import ContactList from '../../../../components/messages/ContactList';
import '../styles/sass/contactlist/hostContactList.scss';


const HostContactList = ({ userId, onContactClick, message }) => {
    const socket = useContext(WebSocketContext);
    const { contacts, pendingContacts, loading, setContacts } = useFetchContacts(userId);


    return (
        <ContactList
            userId={userId}
            onContactClick={onContactClick}
            message={message}
            ContactItemComponent={HostContactItem}
            contacts={contacts}
            loading={loading}
            pendingContacts={pendingContacts}
            setContacts={setContacts}
            labels={{
                contacts: 'Contacts',
                pending: 'Sent requests',
                noContacts: 'No contacts found.',
                noPending: 'No requests sent.'
            }}
            classNamePrefix="host-contact-list"

            socket={socket}
           
        />
    );
};

export default HostContactList;
