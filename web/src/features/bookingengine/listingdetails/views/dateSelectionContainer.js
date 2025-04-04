import { useState } from "react";
import CheckIn from "../components/checkIn";
import Checkout from "../components/checkOut";

const DateSelectionContainer = () => {
  const [checkInDate, setCheckInDate] = useState();
  const [checkOutDate, setCheckOutDate] = useState();
  const [nights, setNights] = useState();

  return (
    <div className="date-container">
      <CheckIn checkInDate={checkInDate} setCheckInDate={setCheckInDate} />
      <div className="nights-info">
        <p className="nights">{nights ? `${nights} nights` : ""}</p>
        <div className="arrow">↔</div>
      </div>
      <Checkout checkOutDate={checkOutDate} setCheckOutDate={setCheckOutDate} />
    </div>
  );
};

export default DateSelectionContainer;
