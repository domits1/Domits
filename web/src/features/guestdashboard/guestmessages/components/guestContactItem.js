import React from 'react';
import profileImage from '../domits-logo.jpg';
import useFetchBookingDetails from '../../../hostdashboard/hostmessages/hooks/useFetchBookingDetails';
import ContactItem from '../../../../components/messages/ContactItem';


const GuestContactItem = ({ contact, userId, isPending, selected }) => {
    const { bookingDetails, accommodation } = useFetchBookingDetails(contact.hostId, userId, {
        accommodationEndpoint: 'bookingEngine/listingDetails',
    });
    const key = accommodation?.images?.[0]?.key;
    const accoImage = key
        ? `https://accommodation.s3.eu-north-1.amazonaws.com/${key}`
        : null;

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
