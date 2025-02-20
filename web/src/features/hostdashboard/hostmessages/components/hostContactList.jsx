import React, { useState, useEffect, useContext } from 'react';
import useFetchContacts from '../hooks/useFetchContacts';
import ContactItem from './hostContactItem';
import { WebSocketContext } from '../context/webSocketContext';
import '../styles/hostContactList.css';

const ContactList = ({ userId, onContactClick }) => {
    const { contacts, pendingContacts, loading, error, setContacts } = useFetchContacts(userId);
    const { messages: wsMessages } = useContext(WebSocketContext);
    const [displayType, setDisplayType] = useState('contacts');

    // useEffect(() => {
    //     if (!wsMessages || wsMessages.length === 0) return;

    //     setContacts((prevContacts) => {
    //         const updatedContacts = prevContacts.map((contact) => {
    //             const newMessage = wsMessages.find(msg => msg.recipientId === contact.userId);
    //             if (newMessage) {
    //                 return {
    //                     ...contact,
    //                     latestMessage: {
    //                         message: newMessage.message,
    //                         createdAt: newMessage.createdAt,
    //                     },
    //                 };
    //             }
    //             return contact;
    //         });

    //         return updatedContacts.sort((a, b) =>
    //             new Date(b.latestMessage?.createdAt || 0) - new Date(a.latestMessage?.createdAt || 0)
    //         );
    //     });

    // }, [wsMessages, setContacts]);

    if (error) {
        return <p className="contact-list-error-text">{error}</p>;
    }

    const contactList = displayType === 'contacts' ? contacts : pendingContacts;
    const noContactsMessage = displayType === 'contacts' ? 'No contacts found.' : 'No pending contacts found.';

    const handleContactClick = (contactId, contactName) => {
        if (onContactClick) {
            onContactClick(contactId, contactName);
        }
    };

    return (
        <div className="contact-list-modal">
            <div className="contact-list-toggle">
                <button
                    onClick={() => setDisplayType('contacts')}
                    className={displayType === 'contacts' ? 'active' : ''}
                >
                    Contacts
                </button>
                <button
                    onClick={() => setDisplayType('pendingContacts')}
                    className={displayType === 'pendingContacts' ? 'active' : ''}
                >
                    Incoming requests
                </button>
            </div>

            <ul className="contact-list-list">
                {loading ? (
                    <p className="contact-list-loading-text">Loading contacts...</p>
                ) : contactList.length === 0 ? (
                    <p className="contact-list-empty-text">{noContactsMessage}</p>
                ) : (
                    contactList
                        .sort((a, b) => new Date(b.latestMessage.createdAt) - new Date(a.latestMessage.createdAt))
                        .map((contact) => (
                            <li key={contact.userId} className="contact-list-list-item" onClick={() => handleContactClick(contact.recipientId, contact.givenName)}>
                                <ContactItem
                                    contact={contact}
                                    isPending={displayType === 'pendingContacts'}
                                />
                            </li>
                        ))
                )}
            </ul>
        </div>
    );
};

export default ContactList;
