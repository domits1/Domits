import React, { useState } from 'react';

const ContactItem = ({ contact, userId, isPending, selected, setContacts, handleAccept, handleReject, accoImage, profileImage, bookingDetails,  }) => {
    const [error, setError] = useState(null);

    return (
        <div className={`contact-item-content ${selected ? 'selected' : ''} ${!accoImage ? 'no-accommodation-image' : ''}`}>
            <div className="contact-item-image-container">
                {accoImage && (
                    <img src={accoImage} alt="Accommodation" className="contact-item-accommodation-image" />
                )}
                <img src={profileImage} alt="Profile" className="contact-item-profile-image" />
            </div>

            <div className="contact-item-text-container">
                <p className="contact-item-full-name">{contact.givenName}</p>

                {!isPending && (
                    <p className="contact-item-subtitle">
                        {bookingDetails?.Status === "Accepted" && <p id='status'>Reservation approved</p>}
                        {bookingDetails?.Status === "Pending" && <p id='status'>Inquiry sent</p>}
                        {bookingDetails?.Status === "Failed" && <p id='status'>Reservation unsuccessful</p>}
                        {contact.latestMessage?.text
                            ? contact.latestMessage.text
                            : "No message history yet"}
                    </p>
                )}

                {isPending && setContacts && (
                    <div className="contact-item-buttons-container">
                        <button onClick={handleAccept} className="accept-button">Accept</button>
                        <button onClick={handleReject} className="reject-button">Deny</button>
                    </div>
                )}
            </div>

            {error && <p className="error-message">{error}</p>}
        </div>
    );
};

export default ContactItem;
