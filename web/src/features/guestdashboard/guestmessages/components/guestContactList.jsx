import React, { useContext } from 'react';
import useFetchContacts from '../hooks/useFetchContacts';
import GuestContactItem from './guestContactItem';
import { WebSocketContext } from "../../../hostdashboard/hostmessages/context/webSocketContext";
import ContactList from '../../../../components/messages/ContactList';
import '../../../hostdashboard/hostmessages/styles/sass/contactlist/hostContactList.scss';
const GuestContactList = ({ userId, onContactClick, message }) => {
    const socket = useContext(WebSocketContext);
    const { contacts, pendingContacts, loading, setContacts } = useFetchContacts(userId);


    return (
        <ContactList
            userId={userId}
            onContactClick={onContactClick}
            message={message}
            ContactItemComponent={GuestContactItem}
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
            classNamePrefix="guest-contact-list"

            socket={socket}
           
        />
    );

};


export default GuestContactList;