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
                        {contact.latestMessage.text
                            ? contact.latestMessage.text || "No message yet" // Adjust field name if needed
                            : "No message available"}
                    </p>
                )}
            </div>

            {/* Conditionally render Accept and Deny buttons only if the contact is a pending request */}
            {isPending && (
                <>
                    <div className="contact-item-buttons-container">
                        <button onClick={handleAccept} className="accept-button">
                            Accept
                        </button>
                        <button onClick={handleReject} className="reject-button">
                            Deny
                        </button>
                    </div>
                </>
            )}

            {error && <p className="error-message">{error}</p>}
        </div>
    );
};

export default ContactItem;
