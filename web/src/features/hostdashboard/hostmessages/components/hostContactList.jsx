import React, { useState, useEffect, useContext } from 'react';
import useFetchContacts from '../hooks/useFetchContacts';
import ContactItem from './hostContactItem';
import { WebSocketContext } from '../context/webSocketContext';
import '../styles/hostContactList.css';

const ContactList = ({ userId, onContactClick, message }) => {
    const { contacts, pendingContacts, loading, error, setContacts } = useFetchContacts(userId);
    const { messages: wsMessages } = useContext(WebSocketContext);
    const [displayType, setDisplayType] = useState('contacts');

    useEffect(() => {
        const updateContactsFromWS = async () => {
            if (wsMessages.length === 0) return;

            setContacts((prevContacts) => {
                const updatedContacts = [...prevContacts];

                wsMessages.forEach((msg) => {
                    const existingContact = updatedContacts.find(c => c.recipientId === msg.userId || c.recipientId === msg.recipientId);

                    if (existingContact) {
                        existingContact.latestMessage = msg;
                    } else {
                        const newContact = {
                            userId: msg.userId,
                            recipientId: msg.userId,
                            givenName: msg.senderName || "New Contact",
                            text: msg,
                        };
                        updatedContacts.push(newContact);
                    }
                });


                return updatedContacts;
            });
        };

        updateContactsFromWS();
    }, [wsMessages, setContacts]);

    useEffect(() => {
        if (message) {
            setContacts((prevContacts) => {
                const updatedContacts = [...prevContacts];

                const contactIndex = updatedContacts.findIndex((contact) => contact.recipientId === message.recipientId);

                if (contactIndex !== -1) {
                    updatedContacts[contactIndex] = {
                        ...updatedContacts[contactIndex],
                        latestMessage: { text: message.text, createdAt: message.createdAt }
                    };
                }

                updatedContacts.sort((a, b) => {
                    const dateA = a.latestMessage?.createdAt ? new Date(a.latestMessage.createdAt) : 0;
                    const dateB = b.latestMessage?.createdAt ? new Date(b.latestMessage.createdAt) : 0;
                    return dateB - dateA;
                });
                return updatedContacts;
            });
        }
    }, [message, setContacts]);

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
                        .filter(contact => contact.latestMessage?.createdAt)
                        .sort((a, b) => {
                            const dateA = a.latestMessage?.createdAt ? new Date(a.latestMessage.createdAt) : 0;
                            const dateB = b.latestMessage?.createdAt ? new Date(b.latestMessage.createdAt) : 0;
                            return dateB - dateA;
                        })
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
