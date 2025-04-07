import React from "react";
import DateSelectionContainer from "./dateSelectionContainer";
import GuestSelectionContainer from "./guestSelectionContainer";

const BookingContainer = () => {
  return (
    <div className="booking-container">
      <h3 className="booking-title">Booking details</h3>
      <DateSelectionContainer />
      <br />
      <GuestSelectionContainer />
      <br />
      <button className="reserve-btn">Reserve</button>
      <p className="note">*You won’t be charged yet</p>
      <hr />
    </div>
  );
};

export default BookingContainer;
