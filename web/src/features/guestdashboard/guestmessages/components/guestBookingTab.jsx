import React from 'react';
import useFetchBookingDetails from '../hooks/useFetchBookingDetails';
import BookingTab from '../../../../components/messages/BookingTab';
import { FaHome } from 'react-icons/fa';
import '../styles/sass/bookingtab/guestBookingTab.scss';


const GuestBookingTab = ({ userId, contactId }) => {
    const { bookingDetails, accommodation } = useFetchBookingDetails(contactId, userId);


    return (
        <BookingTab
            bookingDetails={bookingDetails}
            accommodation={accommodation}
        />
    );
};

export default GuestBookingTab;
