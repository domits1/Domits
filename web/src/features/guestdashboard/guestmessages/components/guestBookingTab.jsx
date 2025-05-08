import React from 'react';
import useFetchBookingDetails from '../../../hostdashboard/hostmessages/hooks/useFetchBookingDetails';
import BookingTab from '../../../../components/messages/BookingTab';
import '../styles/sass/bookingtab/guestBookingTab.scss';


const GuestBookingTab = ({ userId, contactId }) => {
    const { bookingDetails, accommodation } = useFetchBookingDetails(contactId, userId, {
        accommodationEndpoint: 'bookingEngine/listingDetails',
    });


    return (
        <BookingTab
            bookingDetails={bookingDetails}
            accommodation={accommodation}
        />
    );
};

export default GuestBookingTab;
