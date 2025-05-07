import React, { useState } from 'react';
import profileImage from '../domits-logo.jpg';
import useFetchBookingDetails from '../hooks/useFetchBookingDetails';
import ContactItem from '../../../../components/messages/ContactItem';


const GuestContactItem = ({ contact, userId, isPending, selected }) => {
    const [error, setError] = useState(null);
    const { bookingDetails, accommodation } = useFetchBookingDetails(contact.hostId, userId);
    const accoImage = accommodation?.Images?.image1;


    return (
        <ContactItem
            contact={contact}
            isPending={isPending}
            selected={selected}
            userId={userId}
            accoImage={accoImage}
            profileImage={profileImage}
            bookingDetails={bookingDetails}
        />
    );
};

export default GuestContactItem;
