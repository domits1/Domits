import React from 'react';
import useFetchBookingDetails from '../../../hostdashboard/hostmessages/hooks/useFetchBookingDetails';
import BookingTab from '../../../../components/messages/BookingTab';
import '../../../hostdashboard/hostmessages/styles/sass/bookingtab/hostBookingTab.scss';


const GuestBookingTab = ({ userId, contactId }) => {
    const { bookingDetails, accommodation } = useFetchBookingDetails(contactId, userId, {
        accommodationEndpoint: 'bookingEngine/listingDetails',
    });
    if (bookingDetails?.message === "No data found for the given hostId and guestId") {
        return;
    }


    return (
        <BookingTab
            bookingDetails={bookingDetails}
            accommodation={accommodation}
        />
    );
};

export default GuestBookingTab;
