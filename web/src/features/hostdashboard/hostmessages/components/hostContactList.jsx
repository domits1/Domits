import React from 'react';
import useFetchContacts from '../hooks/useFetchContacts';
import ContactItem from './hostContactItem';
import '../styles/hostContactList.css';

const ContactList = ({ userId }) => {
    const { contacts, loading, error } = useFetchContacts(userId);

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

    // Filter out the user themselves
    const filteredContacts = contacts.filter(contact => {
        const contactIdString = String(contact.userId);
        const userIdString = String(userId);
        return contactIdString !== userIdString;
    });

    if (filteredContacts.length === 0) {
        return <p className="contact-list-empty-text">No contacts found.</p>;
    }

    return (
        <div className="contact-list-modal">
            <ul className="contact-list-list">
                {filteredContacts.map((contact) => (
                    <li key={contact.userId} className="contact-list-list-item">
                       <p> <ContactItem contact={contact} currentUserId={userId} /> </p>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default ContactList;
