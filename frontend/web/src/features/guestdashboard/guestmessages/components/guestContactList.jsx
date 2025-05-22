import React, { useState, useEffect, useContext } from 'react';
import useFetchContacts from '../hooks/useFetchContacts';
import ContactItem from './guestContactItem';
import '../styles/guestContactList.css';

const ContactList = ({ userId, onContactClick, message }) => {
    const { contacts, pendingContacts, loading, error, setContacts } = useFetchContacts(userId);
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
            <div className="guest-contact-list-toggle">
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
                    Sent requests
                </button>
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
                                />
                            </li>
                        ))
                )}
            </ul>
        </div>
    );

};


export default ContactList;