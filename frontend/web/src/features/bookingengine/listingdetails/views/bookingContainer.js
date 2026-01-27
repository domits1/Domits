import React, { useState, useEffect } from "react";
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
  
  const [priceData, setPriceData] = useState(null);

  const handleReservePress = useHandleReservePress();

  useEffect(() => {
    const fetchPrice = async () => {
      if (!nights || nights < 1) return;

      console.log("Fetching price for:", checkInDate, "to", checkOutDate);

      await new Promise(r => setTimeout(r, 300));

      const mockResponse = {
         totalPriceCents: 96000, 
         basePriceCents: 66000, 
         breakdown: {
             cleaningCents: 5000,
             serviceFeeCents: 15000,
             taxesCents: 10000
         }
      };
      
      console.log("Price calculated:", mockResponse);
      setPriceData(mockResponse);
    };

    fetchPrice();
  }, [checkInDate, checkOutDate, nights, property]);

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
      
      <Pricing 
        pricing={property.pricing}
        priceData={priceData}      
        nights={nights} 
      />
    </div>
  );
};

export default BookingContainer;