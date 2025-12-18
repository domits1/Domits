import React, { useState, useEffect } from "react";
import CheckIn from "../components/checkIn";
import CheckOut from "../components/checkOut";
import BookingCalendar from "../../../bookingengine/BookingCalendar";

const DateSelectionContainer = ({
  checkInDate,
  setCheckInDate,
  checkOutDate,
  setCheckOutDate,
  setNights,
  dynamicPrices,
  passedProp,
}) => {
  const [showCalendar, setShowCalendar] = useState(false);

  // Calculate nights using useEffect to avoid setting state during render
  useEffect(() => {
    if (checkInDate && checkOutDate) {
      const checkIn = new Date(checkInDate);
      const checkOut = new Date(checkOutDate);

      const timeDifference = checkOut.getTime() - checkIn.getTime();
      const diffDays = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));

      setNights(diffDays);
    }
  }, [checkInDate, checkOutDate, setNights]);

  const nights = checkInDate && checkOutDate ?
    Math.ceil((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24)) :
    null;

  // Convert ISO date strings to Date objects for BookingCalendar
  const handleCheckInChange = (date) => {
    const dateStr = date.toISOString().split("T")[0];
    setCheckInDate(dateStr);
  };

  const handleCheckOutChange = (date) => {
    if (date) {
      const dateStr = date.toISOString().split("T")[0];
      setCheckOutDate(dateStr);
      setShowCalendar(false); // Close calendar after selecting checkout date
    } else {
      setCheckOutDate("");
    }
  };

  // Filter functions for calendar
  const checkInFilter = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  };

  const checkOutFilter = (date) => {
    if (!checkInDate) return true;
    const checkIn = new Date(checkInDate);
    return date > checkIn;
  };

  // Debug: Log what's being passed to BookingCalendar
  useEffect(() => {
    console.log("🟢 DateSelectionContainer - checkInDate:", checkInDate);
    console.log("🟢 DateSelectionContainer - checkOutDate:", checkOutDate);
    console.log("🟢 DateSelectionContainer - checkIn Date object:", checkInDate ? new Date(checkInDate) : null);
    console.log("🟢 DateSelectionContainer - checkOut Date object:", checkOutDate ? new Date(checkOutDate) : null);
    console.log("🟢 DateSelectionContainer - dynamicPrices:", dynamicPrices);
  }, [checkInDate, checkOutDate, dynamicPrices]);

  return (
    <div className="date-container">
      <div onClick={() => setShowCalendar(!showCalendar)} style={{ cursor: 'pointer' }}>
        <CheckIn
          checkInDate={checkInDate}
          setCheckInDate={setCheckInDate}
          checkOutDate={checkOutDate}
        />

        <div className="nights-info">
          {nights && <p>{`${nights} night${nights !== 1 ? "s" : ""}`}</p>}
          <div className="arrow">↔</div>
        </div>

        <CheckOut
          checkOutDate={checkOutDate}
          setCheckOutDate={setCheckOutDate}
          checkInDate={checkInDate}
        />
      </div>

      {showCalendar && (
        <div style={{ marginTop: '1rem' }}>
          <BookingCalendar
            passedProp={passedProp || {
              MinimumStay: 0,
              MaximumStay: 0,
              MinimumAdvanceReservation: 0,
              MaximumAdvanceReservation: 0
            }}
            checkIn={checkInDate ? new Date(checkInDate) : null}
            checkOut={checkOutDate ? new Date(checkOutDate) : null}
            onCheckInChange={handleCheckInChange}
            onCheckOutChange={handleCheckOutChange}
            checkInFilter={checkInFilter}
            checkOutFilter={checkOutFilter}
            dynamicPrices={dynamicPrices || {}}
          />
        </div>
      )}
    </div>
  );
};

export default DateSelectionContainer;
