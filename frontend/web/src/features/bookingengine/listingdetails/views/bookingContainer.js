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

  const [isInitiatingContact, setIsInitiatingContact] = useState(false);

  const handleAddToContacts = async () => {
    if (isInitiatingContact) return;

    setIsInitiatingContact(true);
    try {
      const token = getAccessToken();
      if (!token) {
        alert("Please log in to contact the host.");
        return;
      }

      const body = {
        hostId: property?.property?.hostId,
        userId: null,
        propertyId: property?.property?.id,
      };

      const res = await fetch("https://tgkskhfz79.execute-api.eu-north-1.amazonaws.com/General-Messaging-Production-Create-WebSocketMessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : undefined,
        },
        body: JSON.stringify({
          action: "initiateConversation",
          hostId: property?.property?.hostId,
          propertyId: property?.property?.id
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to initiate chat");
      }

      // Show success message with property info
      alert(`Chat initiated with host for "${property?.property?.title}". Opening messages.`);

      // Navigate to messages
      navigate("/guest/messages");

    } catch (e) {
      console.error("Error initiating contact:", e);
      alert(`Could not send contact request: ${e.message}. Please try again later.`);
    } finally {
      setIsInitiatingContact(false);
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
      <button
        className="reserve-btn"
        onClick={handleAddToContacts}
        disabled={isInitiatingContact}
      >
        {isInitiatingContact ? "Connecting..." : "Add to contact list"}
      </button>
    </div>
  );
};

export default BookingContainer;
