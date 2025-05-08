import React from 'react';
import useFetchBookingDetails from '../hooks/useFetchBookingDetails';
import BookingTab from '../../../../components/messages/BookingTab';
import '../styles/sass/bookingtab/hostBookingTab.scss';

const HostBookingTab = ({ userId, contactId }) => {
    const { bookingDetails, accommodation } = useFetchBookingDetails(userId, contactId,
        {
            withAuth: true,
            accommodationEndpoint: 'hostDashboard/single',
        });
    const roomRate = accommodation?.pricing?.roomRate || 0;
    const cleaning = accommodation?.pricing?.cleaning || 0;
    const service = accommodation?.pricing?.service || 0;
    const earnings = roomRate * bookingDetails?.Nights;

    const earningsComponent = (
        <div className="earnings">
            <h3>Earnings</h3>
            <div className="rent-nights">
                <h4>${roomRate} x {bookingDetails?.Nights} nights</h4>
                <p>${earnings}</p>
            </div>
            <div className="cleaning-fee">
                <h4>Cleaning fee</h4>
                <p>${cleaning}</p>
            </div>
            <div className="service-fee">
                <h4>Service fee</h4>
                <p>${service}</p>
            </div>
            <div className="total-earnings">
                <h4>Total $</h4>
                <h4>${earnings + cleaning + service}</h4>
            </div>
        </div>
    );

    return (
        <div className="host-booking-tab">
            <BookingTab
                bookingDetails={bookingDetails}
                accommodation={accommodation}
                earningsComponent={earningsComponent}
            />
        </div>
    );
};

export default HostBookingTab;
