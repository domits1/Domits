import React from "react";
import { useNavigate } from "react-router-dom";
import StayOverviewCard, { stayShape } from "./StayOverviewCard";

function CurrentStayCard({ stay }) {
  const navigate = useNavigate();
  const handleMessageHost = () => {
    const bookingId = stay.bookingId || stay.id || null;
    const messagesPath = bookingId
      ? `/guestdashboard/messages?bookingId=${encodeURIComponent(bookingId)}`
      : "/guestdashboard/messages";
    navigate(messagesPath, {
      state: {
        messageContext: {
          contactId: stay.hostId || null,
          contactName: stay.hostName || "Host",
          contactImage: stay.hostImage || null,
          bookingId,
          propertyId: stay.propertyId || null,
          propertyTitle: stay.name || null,
          accoImage: stay.image || null,
        },
      },
    });
  };

  return (
    <StayOverviewCard
      cardClassName="currentStayCard"
      title="Your current stay"
      stay={stay}
      actionClassName="stayActions"
      onOpenReservation={() => navigate(`/guestdashboard/reservation/${stay.bookingId || stay.id}`)}
      onMessageHost={handleMessageHost}
    />
  );
}

CurrentStayCard.propTypes = {
  stay: stayShape,
};

export default CurrentStayCard;
