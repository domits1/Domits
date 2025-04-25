import React, { useState } from 'react';
import profileImage from '../domits-logo.jpg';
import useFetchBookingDetails from '../hooks/useFetchBookingDetails';


const ContactItem = ({ contact, userId, isPending, selected }) => {
    const [error, setError] = useState(null);
    const { bookingDetails, accommodation } = useFetchBookingDetails(contact.hostId, userId);
    const accoImage = accommodation?.Images?.image1;


    return (
        <div className={`guest-contact-item-content ${selected ? 'selected' : ''} ${!accoImage ? 'no-accommodation-image' : ''}`}>

            <div className={`guest-contact-item-image-container `}>
                {accoImage && (
                    <img src={accoImage} alt="Accommodation" className="guest-contact-item-accommodation-image" />
                )}
                <img src={profileImage} alt="Profile" className="guest-contact-item-profile-image" />
            </div>

            <div className="guest-contact-item-text-container">
                <p className="guest-contact-item-full-name">{contact.givenName}</p>
                {!isPending && (
                    <p className="guest-contact-item-subtitle">
                        {bookingDetails?.Status === "Accepted" && (
                            <p id='status'>Reservation approved</p>
                        )}

                        {bookingDetails?.Status === "Pending" && (
                            <p id='status'>Inquiry sent</p>
                        )}
                        {bookingDetails?.Status === "Failed" && (
                            <p id='status'>Reservation unsuccessful</p>
                        )}
                        
                        {contact.latestMessage.text
                            ? contact.latestMessage.text || "No message yet"
                            : "No message history yet"}
                    </p>
                )}
            </div>

            {error && <p className="error-message">{error}</p>}
        </div>
    );
};

export default ContactItem;
