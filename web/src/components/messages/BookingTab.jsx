import React from "react";
import { FaHome } from 'react-icons/fa';
import useFetchBookingDetails from "../../features/hostdashboard/hostmessages/hooks/useFetchBookingDetails";
import '../../features/hostdashboard/hostmessages/styles/sass/bookingtab/hostBookingTab.scss';


const BookingTab = ({ userId, contactId, dashboardType }) => {
    const isGuest = dashboardType === 'guest';
    const hostId = isGuest ? contactId : userId;
    const guestId = isGuest ? userId : contactId;

    const { bookingDetails, accommodation } = useFetchBookingDetails(
        hostId,
        guestId,
        {
            accommodationEndpoint: isGuest
                ? 'bookingEngine/listingDetails'
                : 'hostDashboard/single',
            withAuth: !isGuest,
        }
    );
    if (bookingDetails?.message === "No data found for the given hostId and guestId") {
        return;
    }
    console.log('Calling useFetchBookingDetails with:', {
        hostId,
        guestId,
    });


    const firstImage = `https://accommodation.s3.eu-north-1.amazonaws.com/${accommodation?.images?.[0]?.key}`;
    const formatHour = (hour) => {
        return `${hour}:00`;
    };
    const roomRate = accommodation?.pricing?.roomRate || 0;
    const cleaning = accommodation?.pricing?.cleaning || 0;
    const service = accommodation?.pricing?.service || 0;
    const earnings = roomRate * bookingDetails?.Nights;

    return (
        <div className="booking-tab-container">
            {bookingDetails && (
                <div className="booking-tab">
                    <div className="acco-image">
                        {accommodation?.property?.title && <h3>{accommodation?.property?.title}</h3>}
                        {accommodation?.images?.[0]?.key && (
                            <img
                                src={firstImage}
                                alt="Accommodation"
                            />
                        )}
                    </div>
                    {bookingDetails?.Status === 'Accepted' && (
                        <div className="booking-status">
                            <h3>Booking Successful</h3>
                            <p>If you need to offer or request money for an issue from the trip, you can use Domits support.</p>
                            <button className="report-problem-button">Report a Problem</button>
                        </div>
                    )}
                    {bookingDetails?.Status === 'Pending' && (
                        <div className="booking-status">
                            <h3>Reservation Pending</h3>
                            <p>Your booking request has been sent. We’ll notify you once it’s accepted or declined.</p>
                        </div>
                    )}
                    {bookingDetails?.Status === 'Failed' && (
                        <div className="booking-status">
                            <h3>Reservation Failed</h3>
                            <p>Something went wrong while processing your reservation. Please try again or contact support.</p>
                            <button className="retry-booking-button">Try Again</button>
                        </div>
                    )}
                    <div className="chekin-checkout">
                        <div className="checkin">
                            <h3>Check in</h3>
                            <p>{bookingDetails?.arrivalDate}</p>
                            <p>{formatHour(accommodation?.checkIn.checkIn.from)}-{formatHour(accommodation?.checkIn.checkIn.till)}</p>
                        </div>
                        <div className="nights">
                            <p>{bookingDetails?.Nights}</p>
                            <p>nights</p>

                        </div>
                        <div className="checkout">
                            <h3>Check out</h3>
                            <p>{bookingDetails?.departureDate}</p>
                            <p>{formatHour(accommodation?.checkIn.checkOut.from)}-{formatHour(accommodation?.checkIn.checkOut.till)}</p>
                        </div>
                    </div>
                    <div className="street">
                        <div className="iconHouse"><FaHome />
                        </div> <p>{accommodation?.location?.street} {accommodation?.location?.houseNumber}{accommodation?.location?.houseNumberExtension} </p>
                    </div>
                    <div className="reservation-details">
                        <h3>Reservation Details</h3>
                        <div className="guest-amount">
                            <h4>Amount of guests</h4>
                            <p>{bookingDetails?.guests} Travelers</p>
                        </div>


                        <div className="booking-id">
                            <p>Booking ID: {bookingDetails?.id}</p>
                        </div>

                        <div className="house-rules">
                            <h4>House rules</h4>
                            <p>{accommodation?.Capacity} guests maximum</p>
                            {accommodation?.rules?.[0]?.value ? <p>Pets allowed</p> : <p>No pets</p>}

                            {accommodation?.rules[1]?.value ? <p>Parties allowed</p> : <p>No parties</p>}
                            {accommodation?.rules[2]?.value ? <p>Smoking allowed</p> : <p>No smoking</p>}
                        </div>

                    </div>

                    {dashboardType === 'host' && (
                        <div className="earnings-section">
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
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BookingTab;