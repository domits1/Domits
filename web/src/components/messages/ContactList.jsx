import React, { useState, useEffect, useContext } from 'react';
import { WebSocketContext } from '../../features/hostdashboard/hostmessages/context/webSocketContext';
import useFetchContacts from '../../features/hostdashboard/hostmessages/hooks/useFetchContacts';
import ContactItem from './ContactItem';
import '../../features/hostdashboard/hostmessages/styles/sass/contactlist/hostContactList.scss';

const ContactList = ({ userId, onContactClick, message, dashboardType }) => {
    const { contacts, pendingContacts, loading, setContacts } = useFetchContacts(userId, dashboardType);
    const [selectedContactId, setSelectedContactId] = useState(null);
    const [displayType, setDisplayType] = useState('contacts');
    const socket = useContext(WebSocketContext);
    const wsMessages = socket?.messages || [];

    const labels = {
        contacts: 'Contacts',
        pending: 'Sent requests',
        noContacts: 'No contacts found.',
        noPending: 'No requests sent.'
    }

    useEffect(() => {
        if (wsMessages?.length === 0) return;
        setContacts(prevContacts => {
            const updatedContacts = [...prevContacts];
            wsMessages.forEach((msg) => {
                const contact = updatedContacts.find(c => c.recipientId === msg.userId || c.recipientId === msg.recipientId);
                if (contact) {
                    contact.latestMessage = msg;
                }
            });
            return updatedContacts;
        });
    }, [wsMessages, setContacts]);

    useEffect(() => {
        if (!message) return;
        setContacts(prevContacts => {
            const updatedContacts = [...prevContacts];
            const index = updatedContacts.findIndex(c => c.recipientId === message.recipientId);
            if (index !== -1) {
                updatedContacts[index] = {
                    ...updatedContacts[index],
                    latestMessage: { text: message.text, createdAt: message.createdAt }
                };
            }
            updatedContacts.sort((a, b) => new Date(b.latestMessage?.createdAt || 0) - new Date(a.latestMessage?.createdAt || 0));
            return updatedContacts;
        });
    }, [message, setContacts]);

    const contactList = displayType === 'contacts' ? contacts : pendingContacts;
    const noContactsMessage = displayType === 'contacts' ? labels.noContacts : labels.noPending;

    const handleClick = (contactId, contactName) => {
        setSelectedContactId(contactId);
        onContactClick?.(contactId, contactName);
    };

    return (
        <div className={`${dashboardType}-contact-list-modal`}>
            <h3>Message dashboard</h3>
            <div className={`contact-list-toggle`}>
                <select
                    value={displayType}
                    onChange={(e) => setDisplayType(e.target.value)}
                    className="contact-dropdown"
                >
                    <option value="contacts">{labels.contacts}</option>
                    <option value="pendingContacts">{labels.pending}</option>
                </select>
            </div>

            <ul className={`contact-list-list`}>
                {loading ? (
                    <p className={`contact-list-loading-text`}>Loading contacts...</p>
                ) : contactList.length === 0 ? (
                    <p className={`contact-list-empty-text`}>{noContactsMessage}</p>
                ) : (
                    contactList
                        .sort((a, b) => new Date(b.latestMessage?.createdAt || 0) - new Date(a.latestMessage?.createdAt || 0))
                        .map((contact) => (
                            <li
                                key={contact.userId}
                                className={`contact-list-list-item ${displayType === 'pendingContacts' ? 'disabled' : ''}`}
                                onClick={() => displayType !== 'pendingContacts' && handleClick(contact.recipientId, contact.givenName)}
                            >
                                <ContactItem
                                    contact={contact}
                                    isPending={displayType === 'pendingContacts'}
                                    setContacts={setContacts}
                                    userId={userId}
                                    selected={selectedContactId === contact.recipientId}
                                    dashboardType={dashboardType}
                                />
                            </li>
                        ))
                )}
            </ul>
        </div>
    );
};

export default ContactList;
