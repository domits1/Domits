import React, { useState } from 'react';
import useFetchContacts from '../hooks/useFetchContacts';
import ContactItem from './hostContactItem';
import '../styles/hostContactList.css';

const ContactList = ({ userId }) => {
    const { contacts, pendingContacts, loading, error } = useFetchContacts(userId);
    const [displayType, setDisplayType] = useState('contacts');

    if (loading) {
        return (
            <div className="contact-list-loading-container">
                <p>Loading contacts...</p>
            </div>
        );
    }

    if (error) {
        return <p className="contact-list-error-text">{error}</p>;
    }

    const contactList = displayType === 'contacts' ? contacts : pendingContacts;
    const noContactsMessage = displayType === 'contacts' ? 'No contacts found.' : 'No pending contacts found.';

    // if (filteredContacts.length === 0) {
    //     return <p className="contact-list-empty-text">No contacts found.</p>;
    // }

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
                {contactList.length === 0 ? (
                    <p className="contact-list-empty-text">{noContactsMessage}</p>
                ) : (
                    contactList.map((contact) => (
                        <li key={contact.userId} className="contact-list-list-item">
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
