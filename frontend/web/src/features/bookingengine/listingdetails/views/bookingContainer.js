import React, { useState, useEffect } from "react";
import DateSelectionContainer from "./dateSelectionContainer";
import GuestSelectionContainer from "./guestSelectionContainer";
import Pricing from "../components/pricing";
import useHandleReservePress from "../hooks/handleReservePress";
import { calendarService } from "../../../hostdashboard/hostcalen/services/calendarService";

const BookingContainer = ({ property, checkInDate, checkOutDate, setCheckInDate, setCheckOutDate }) => {
  const [nights, setNights] = useState(1);
  const [adults, setAdults] = useState(1);
  const [kids, setKids] = useState(0);
  const [dynamicPrices, setDynamicPrices] = useState({});

  const handleReservePress = useHandleReservePress();

  // Calculate nights when dates change
  useEffect(() => {
    if (checkInDate && checkOutDate) {
      const start = new Date(checkInDate);
      const end = new Date(checkOutDate);
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      setNights(diffDays > 0 ? diffDays : 1);
    }
  }, [checkInDate, checkOutDate]);

  // Fetch dynamic pricing when property ID is available
  useEffect(() => {
    const fetchDynamicPricing = async () => {
      if (property?.property?.id) {
        try {
          const calendarData = await calendarService.loadCalendarData(property.property.id);
          setDynamicPrices(calendarData.prices || {});
        } catch (error) {
          setDynamicPrices({});
        }
      }
    };

    fetchDynamicPricing();
  }, [property?.property?.id]);

  return (
    <div className="booking-container">
      <h3 className="booking-title">Booking details</h3>
      <DateSelectionContainer
        checkInDate={checkInDate}
        setCheckInDate={setCheckInDate}
        checkOutDate={checkOutDate}
        setCheckOutDate={setCheckOutDate}
        setNights={setNights}
        dynamicPrices={dynamicPrices}
        passedProp={property?.availability || {
          MinimumStay: 0,
          MaximumStay: 0,
          MinimumAdvanceReservation: 0,
          MaximumAdvanceReservation: 0
        }}
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
      <p className="note">*You won't be charged yet</p>
      <hr />
      <Pricing
        pricing={property.pricing}
        nights={nights}
        guests={adults + kids}
        checkInDate={checkInDate}
        checkOutDate={checkOutDate}
        dynamicPrices={dynamicPrices}
      />
    </div>
  );
};

export default BookingContainer;
