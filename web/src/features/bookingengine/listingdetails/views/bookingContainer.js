import React, { useState } from "react";
import DateSelectionContainer from "./dateSelectionContainer";
import GuestSelectionContainer from "./guestSelectionContainer";
import Pricing from "../components/pricing";

const BookingContainer = ({ property }) => {
  const [nights, setNights] = useState();
  const [adults, setAdults] = useState();
  return (
    <div className="booking-container">
      <h3 className="booking-title">Booking details</h3>
      <DateSelectionContainer setNights={setNights} />
      <br />
      <GuestSelectionContainer setAdultsParent={setAdults} />
      <br />
      <button className="reserve-btn" disabled={adults < 1}>Reserve</button>
      <p className="note">*You won’t be charged yet</p>
      <hr />
      <Pricing pricing={property.pricing} nights={nights} />
    </div>
  );
};

export default BookingContainer;
