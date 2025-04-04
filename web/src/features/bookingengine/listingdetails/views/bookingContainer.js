import React from "react";

const BookingContainer = () => {
  return (
    <div className="booking-container">
      <h3 className="booking-title">Booking details</h3>
      <button className="reserve-btn">Reserve</button>
      <p className="note">*You won’t be charged yet</p>
    </div>
  );
};

export default BookingContainer;