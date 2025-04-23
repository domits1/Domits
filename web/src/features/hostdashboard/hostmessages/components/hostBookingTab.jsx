import React from 'react';
import useFetchBookingDetails from '../hooks/useFetchBookingDetails';

import { FaHome } from 'react-icons/fa';


const HostBookingTab = ({ userId, contactId }) => {
    const { bookingDetails, accommodation } = useFetchBookingDetails(userId, contactId);
    const firstImage = accommodation?.Images?.[0] && Object.values(accommodation.Images[0])[0];
    const price = accommodation?.Rent * bookingDetails?.Nights;


    return (
        <div className="host-booking-tab-container">
            {bookingDetails && (
                <div className="host-booking-tab">


                    <div className="acco-image">
                        {accommodation?.Title && <h3>{accommodation.Title}</h3>}
                        {accommodation?.Images?.[0] && (
                            <img
                                src={firstImage}
                                alt="Accommodation"
                            />
                        )}
                    </div>
                    {bookingDetails?.Status === 'Accepted' && (
                        <div className="booking-successful">
                            <h3>Booking Successful</h3>
                            <p>If you need to offer or request money for an issue from the trip, you can use Domits support.</p>
                            <button className="report-problem-button">Report a Problem</button>
                        </div>
                    )}
                    <div className="chekin-checkout">
                        <div className="checkin">
                            <h3>Check in</h3>
                            <p>{bookingDetails?.StartDate}</p>
                            <p>{accommodation?.CheckIn?.From}-{accommodation?.CheckIn?.Til}</p>
                        </div>
                        <div className="nights">
                            <p>{bookingDetails?.Nights}</p>
                            <p>nights</p>

                        </div>
                        <div className="checkout">
                            <h3>Check out</h3>
                            <p>{bookingDetails?.EndDate}</p>
                            <p>{accommodation?.CheckOut?.From}-{accommodation?.CheckOut?.Til}</p>
                        </div>
                    </div>
                    <div className="street">
                        <div className="iconHouse"><FaHome />
                        </div> <p>{accommodation?.Street}</p>
                    </div>
                    <div className="reservation-details">
                        <h3>Reservation Details</h3>
                        <div className="guest-amount">
                            <h4>Amount of guests</h4>
                            <p>{bookingDetails?.AmountOfGuest} Travelers</p>
                        </div>


                        <div className="booking-id">
                            <p>Booking ID: {bookingDetails?.ID}</p>
                        </div>

                        {/* <div className="guest-info">
                    <h4>Guest contact info </h4>

                </div> */}

                        <div className="house-rules">
                            <h4>House rules</h4>
                            <p>{accommodation?.Capacity} guests maximum</p>
                            {!accommodation?.HouseRules.AllowPets && <p>No pets</p>}

                            {!accommodation?.HouseRules.AllowParties && <p>No parties</p>}
                            {!accommodation?.HouseRules.AllowSmoking && <p>No smoking</p>}

                        </div>

                    </div>
                    <div className="earnings">
                        <h3>Earnings</h3>
                        <div className="rent-nights">
                            <h4>${accommodation?.Rent} x {bookingDetails?.Nights} nights</h4>
                            <p>${price}</p>
                        </div>
                        <div className="cleaning-fee">
                            <h4>Cleaning fee</h4>
                            <p>${accommodation?.CleaningFee}</p>
                        </div>
                        <div className="service-fee">
                            <h4>Service fee</h4>
                            <p>${accommodation?.ServiceFee}</p>
                        </div>
                        <div className="total-earnings">
                            <h4>Total $</h4>
                            <h4>${price + accommodation?.CleaningFee + accommodation?.ServiceFee}</h4>
                        </div>
                    </div>

                    <div className="space">


                    </div>

                </div>
            )}
        </div>
    );
};

export default HostBookingTab;
