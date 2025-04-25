import React, { useState, useEffect, useContext } from 'react';
import useFetchContacts from '../hooks/useFetchContacts';
import ContactItem from './guestContactItem';

const ContactList = ({ userId, onContactClick, message }) => {
    const { contacts, pendingContacts, loading, error, setContacts } = useFetchContacts(userId);
    const [selectedContactId, setSelectedContactId] = useState(null);
    const [displayType, setDisplayType] = useState('contacts');

    if (error) {
        return <p className="contact-list-error-text">{error}</p>;
    }

    const contactList = displayType === 'contacts' ? contacts : pendingContacts;
    const noContactsMessage = displayType === 'contacts' ? 'No contacts found.' : 'No requests sent.';

    const handleContactClick = (contactId, contactName) => {
        if (onContactClick) {
            onContactClick(contactId, contactName);
        }
    };

    return (
        <div className="guest-contact-list-modal">
            <h3>Message dashboard</h3>

            <div className="guest-contact-list-toggle">
                <select
                    value={displayType}
                    onChange={(e) => setDisplayType(e.target.value)}
                    className="contact-dropdown"
                >
                    <option value="contacts">Contacts</option>
                    <option value="pendingContacts">Sent requests</option>
                </select>
            </div>

            <ul className="guest-contact-list-list">
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
                            <li key={contact.userId} className="guest-contact-list-list-item" onClick={() => handleContactClick(contact.recipientId, contact.givenName)}>
                                <ContactItem
                                    contact={contact}
                                    isPending={displayType === 'pendingContacts'}
                                    userId={userId}
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