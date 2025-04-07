import React, {useState} from "react";
import DateSelectionContainer from "./dateSelectionContainer";
import GuestSelectionContainer from "./guestSelectionContainer";
import Pricing from "../components/pricing";

const BookingContainer = ({ property }) => {
    const [nights, setNights] = useState();
  return (
    <div className="booking-container">
      <h3 className="booking-title">Booking details</h3>
      <DateSelectionContainer setNights={setNights} />
      <br />
      <GuestSelectionContainer />
      <br />
      <button className="reserve-btn">Reserve</button>
      <p className="note">*You won’t be charged yet</p>
      <hr />
        <Pricing pricing={property.pricing} nights={nights}/>
    </div>
  );
};

export default BookingContainer;
