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

// // --- REAL API MODE ---
//   useEffect(() => {
//     const fetchPrice = async () => {
//       if (!nights || nights < 1) {
//           setPriceData(null);
//           return;
//       }

//       console.log("🌍 Fetching REAL price from AWS...");

//       try {
//           const API_URL = "https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/General-Bookings-CRUD-Bookings-develop"; 
          
//           const response = await fetch(API_URL, {
//               method: 'POST',
//               headers: { 
//                 "Content-Type": "application/json" 
//               },
//               body: JSON.stringify({
//                   action: "calculatePrice", 
                  
//                   propertyId: property.property.id, 
//                   startDate: checkInDate,
//                   endDate: checkOutDate,
//                   guests: adults + kids
//               })
//           });

//           if(response.ok) {
//               const json = await response.json();
              
//               let data = json.data || json;
              
//               if (json.body && typeof json.body === 'string') {
//                   try {
//                       const parsedBody = JSON.parse(json.body);
//                       data = parsedBody.data || parsedBody;
//                   } catch(e) { console.warn("Body parse warn", e); }
//               }

//               console.log("💰 AWS Response:", data);
//               setPriceData(data); 

//           } else {
//               console.error("❌ AWS Error:", response.status, response.statusText);
//               try {
//                   const errJson = await response.json();
//                   console.error("Error details:", errJson);
//               } catch(e) {}
              
//               setPriceData(null); 
//           }
//       } catch (e) {
//           console.error("❌ Network failed (CORS or Offline):", e);
//           setPriceData(null); 
//       }
//     };
    
//     // Debounce 500ms
//     const timeoutId = setTimeout(() => fetchPrice(), 500);
//     return () => clearTimeout(timeoutId);

//   }, [checkInDate, checkOutDate, nights, adults, kids, property]);

// TODO: Uncomment REAL API fetching after backend merge & deploy.

// --- MOCK MODE ---
  useEffect(() => {
    const fetchPrice = async () => {
      if (!nights || nights < 1) {
          setPriceData(null);
          return;
      }

      console.log("Mocking price fetch for:", checkInDate, "to", checkOutDate);

      await new Promise(resolve => setTimeout(resolve, 500));

      const mockTotal = 100 * nights * 1.1 + 50;
      
      const mockResponse = {
         totalPriceCents: Math.round(mockTotal * 100),
         basePriceCents: Math.round(100 * nights * 100),
         breakdown: {
             cleaningCents: 5000,
             serviceFeeCents: Math.round(100 * nights * 0.1 * 100),
             taxesCents: 0
         },
         currency: "EUR"
      };
      
      console.log("💰 Mock Response:", mockResponse);
      setPriceData(mockResponse);
    };

    fetchPrice();
  }, [checkInDate, checkOutDate, nights, adults, kids, property]);

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