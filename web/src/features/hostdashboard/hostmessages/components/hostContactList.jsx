import React, { useState, useEffect, useContext } from 'react';
import useFetchContacts from '../hooks/useFetchContacts';
import ContactItem from './hostContactItem';
import { WebSocketContext } from '../context/webSocketContext';

const ContactList = ({ userId, onContactClick, message }) => {
    const { contacts, pendingContacts, loading, error, setContacts } = useFetchContacts(userId);
    const { messages: wsMessages } = useContext(WebSocketContext);
    const [selectedContactId, setSelectedContactId] = useState(null);
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
        setSelectedContactId(contactId);
        if (onContactClick) {
            onContactClick(contactId, contactName);
        }
    };

    return (
        <div className="contact-list-modal">
            {/* <div className="contact-list-toggle">
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
            </div> */}
            <h3>Message dashboard</h3>


            <div className="contact-list-toggle">
                <select
                    value={displayType}
                    onChange={(e) => setDisplayType(e.target.value)}
                    className="contact-dropdown"
                >
                    <option value="contacts">Contacts</option>
                    <option value="pendingContacts">Incoming Requests</option>
                </select>
            </div>
            <ul className="contact-list-list">
                {loading ? (
                    <p className="contact-list-loading-text">Loading contacts...</p>
                ) : contactList.length === 0 ? (
                    <p className="contact-list-empty-text">{noContactsMessage}</p>
                ) : (
                    contactList
                        .sort((a, b) => {
                            const dateA = a.latestMessage?.createdAt ? new Date(a.latestMessage.createdAt) : 0;
                            const dateB = b.latestMessage?.createdAt ? new Date(b.latestMessage.createdAt) : 0;
                            return dateB - dateA;
                        })
                        .map((contact) => (
                            <li
                                key={contact.userId}
                                className={`contact-list-list-item ${displayType === 'pendingContacts' ? 'disabled' : ''} `}
                                onClick={() => {
                                    if (displayType !== 'pendingContacts') {
                                        handleContactClick(contact.recipientId, contact.givenName);
                                    }
                                }}
                            >
                                <ContactItem
                                    contact={contact}
                                    isPending={displayType === 'pendingContacts'}
                                    setContacts={setContacts}
                                    selected={selectedContactId === contact.recipientId}

                                />
                            </li>
                        ))
                )}
            </ul>
        </div>
    );
};

export default ContactList;
