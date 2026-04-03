import React from "react";
import { useNavigate } from "react-router-dom";
import StayOverviewCard, { stayShape } from "./StayOverviewCard";

function UpcomingStayCard({ stay }) {
  const navigate = useNavigate();
  const handleMessageHost = () => {
    navigate("/guestdashboard/messages", {
      state: {
        messageContext: {
          contactId: stay.hostId || null,
          contactName: stay.hostName || "Host",
          contactImage: stay.hostImage || null,
          propertyId: stay.propertyId || null,
          propertyTitle: stay.name || null,
          accoImage: stay.image || null,
        },
      },
    });
  };

  return (
    <StayOverviewCard
      cardClassName="upcomingCard"
      title="Your upcoming stay"
      stay={stay}
      actionClassName="stayActionsSecondary"
      onOpenReservation={() => navigate(`/guestdashboard/reservation/${stay.bookingId || stay.id}`)}
      onMessageHost={handleMessageHost}
      onBrowseBookings={() => navigate("/guestdashboard/bookings")}
    />
  );
}

UpcomingStayCard.propTypes = {
  stay: stayShape,
};

export default UpcomingStayCard;