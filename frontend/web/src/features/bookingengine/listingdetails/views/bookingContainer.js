import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAccessToken } from "../../../../services/getAccessToken";
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
  const navigate = useNavigate();

  const handleAddToContacts = async () => {
    try {
      const token = getAccessToken();
      const body = {
        hostId: property?.property?.hostId,
        userId: null,
        propertyId: property?.property?.id,
      };
      const res = await fetch("https://d1mhedhjkb.execute-api.eu-north-1.amazonaws.com/default/CreateContactRequest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : undefined,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to send contact request");
      alert("Contact request sent. You will be able to chat once accepted.");
      navigate("/guestdashboard");
    } catch (e) {
      console.error(e);
      alert("Could not send contact request. Please try again later.");
    }
  };

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
      <hr />
      <button className="reserve-btn" onClick={handleAddToContacts}>
        Add to contact list
      </button>
    </div>
  );
};

export default BookingContainer;
