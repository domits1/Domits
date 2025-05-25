import React, { useState } from "react";
import DateSelectionContainer from "./dateSelectionContainer";
import GuestSelectionContainer from "./guestSelectionContainer";
import Pricing from "../components/pricing";
import useHandleReservePress from "../hooks/handleReservePress";

const BookingContainer = ({ property }) => {
  const [checkInDate, setCheckInDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split("T")[0],
  );
  const [checkOutDate, setCheckOutDate] = useState(
    new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
  );
  const [nights, setNights] = useState();
  const [adults, setAdults] = useState(1);
  const [kids, setKids] = useState(0);

  const handleReservePress = useHandleReservePress();

  return (
    <div className="booking-container">
      <h3 className="booking-title">Booking details</h3>
      <DateSelectionContainer
        checkInDate={checkInDate}
        setCheckInDate={setCheckInDate}
        checkOutDate={checkOutDate}
        setCheckOutDate={setCheckOutDate}
        setNights={setNights}
      />
      <br />
      <GuestSelectionContainer
        setAdultsParent={setAdults}
        setKidsParent={setKids}
      />
      <br />
      <button
        className="reserve-btn"
        disabled={adults < 1 || nights < 1}
        onClick={() => {
          console.log(adults, " ", kids);
          handleReservePress(
            property.property.id,
            new Date(checkInDate).getTime(),
            new Date(checkOutDate).getTime(),
            adults + kids,
          );
        }}
      >
        Reserve
      </button>
      <p className="note">*You won’t be charged yet</p>
      <hr />
      <Pricing pricing={property.pricing} nights={nights} />
    </div>
  );
};

export default BookingContainer;
