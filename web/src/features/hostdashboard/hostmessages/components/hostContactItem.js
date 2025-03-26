import React, { useState } from 'react';
import profileImage from '../domits-logo.jpg';
import useUpdateContactRequest from "../hooks/useUpdateContactRequest";

const ContactItem = ({ contact, isPending, setContacts }) => {
    const [error, setError] = useState(null);
    const { updateContactRequest } = useUpdateContactRequest(setContacts);


    const handleAccept = async () => {
        try {
            await updateContactRequest(contact.ID, 'accepted');
        } catch (err) {
            setError('Error accepting the contact request.');
        }
    };

    const handleReject = async () => {
        try {
            await updateContactRequest(contact.ID, 'rejected');
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
                            ? contact.latestMessage.text || "No message yet" 
                            : "No message available"}
                    </p>
                )}
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

            </div>



            {error && <p className="error-message">{error}</p>}
        </div>
    );
};

export default ContactItem;
