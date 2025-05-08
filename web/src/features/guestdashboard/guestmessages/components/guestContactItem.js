import React, { useState } from 'react';
import profileImage from '../domits-logo.jpg';
import useFetchBookingDetails from '../../../hostdashboard/hostmessages/hooks/useFetchBookingDetails';

import ContactItem from '../../../../components/messages/ContactItem';


const GuestContactItem = ({ contact, userId, isPending, selected }) => {
    const [error, setError] = useState(null);
    const { bookingDetails, accommodation } = useFetchBookingDetails(contact.hostId, userId, {
        accommodationEndpoint: 'bookingEngine/listingDetails',
    });
    const accoImage = `https://accommodation.s3.eu-north-1.amazonaws.com/${accommodation?.images?.[0]?.key}`;


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
