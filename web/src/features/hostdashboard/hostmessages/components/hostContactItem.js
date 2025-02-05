import React, { useState } from 'react';
import profileImage from '../domits-logo.jpg';

const ContactItem = ({ contact, updateContactRequest, isPending }) => {
    const [error, setError] = useState(null);

    const handleAccept = async () => {
        try {
            await updateContactRequest(contact.userId, 'accepted');
        } catch (err) {
            setError('Error accepting the contact request.');
        }
    };

    const handleReject = async () => {
        try {
            await updateContactRequest(contact.userId, 'rejected');
        } catch (err) {
            setError('Error rejecting the contact request.');
        }
    };

    return (
        <div className="contact-item-content">
            <img src={profileImage} alt="Profile" className="contact-item-profile-image" />
            <div className="contact-item-text-container">
                <p className="contact-item-full-name">{contact.givenName}</p>
                {!isPending && (
                    <p className="contact-item-subtitle">
                        Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text.
                    </p>
                )}
            </div>

            {/* Conditionally render Accept and Deny buttons only if the contact is a pending request */}
            {isPending && (
                <>
                    <button onClick={handleAccept} className="accept-button">
                        Accept
                    </button>
                    <button onClick={handleReject} className="reject-button">
                        Deny
                    </button>
                </>
            )}

            {error && <p className="error-message">{error}</p>}
        </div>
    );
};

export default ContactItem;
