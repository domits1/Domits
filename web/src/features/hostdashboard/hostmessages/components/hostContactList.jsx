import React, { useState } from 'react';
import useFetchContacts from '../hooks/useFetchContacts';
import ContactItem from './hostContactItem';
import '../styles/hostContactList.css';

const ContactList = ({ userId, onContactClick }) => {
    const { contacts, pendingContacts, loading, error } = useFetchContacts(userId);
    const [displayType, setDisplayType] = useState('contacts');

    if (error) {
        return <p className="contact-list-error-text">{error}</p>;
    }

    const contactList = displayType === 'contacts' ? contacts : pendingContacts;
    const noContactsMessage = displayType === 'contacts' ? 'No contacts found.' : 'No pending contacts found.';

    // if (filteredContacts.length === 0) {
    //     return <p className="contact-list-empty-text">No contacts found.</p>;
    // }
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
                    contactList.map((contact) => (
                        <li key={contact.userId} className="contact-list-list-item" onClick={() => handleContactClick(contact.recipientId, contact.givenName)}>
                            
                            <ContactItem
                                contact={contact}
                                // updateContactRequest={updateContactRequest}
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
