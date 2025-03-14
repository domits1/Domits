import React, { useState } from 'react';
import profileImage from '../domits-logo.jpg';

const ContactItem = ({ contact, updateContactRequest, isPending }) => {
    const [error, setError] = useState(null);

    return (
        <div className="guest-contact-item-content">
            <img src={profileImage} alt="Profile" className="guest-contact-item-profile-image" />
            <div className="guest-contact-item-text-container">
                <p className="guest-contact-item-full-name">{contact.givenName}</p>
                {!isPending && (
                    <p className="guest-contact-item-subtitle">
                        {contact.latestMessage.text
                            ? contact.latestMessage.text || "No message yet" // Adjust field name if needed
                            : "No message available"}
                    </p>
                )}
            </div>

            {error && <p className="error-message">{error}</p>}
        </div>
    );
};

export default ContactItem;
