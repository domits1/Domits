import React from "react";
import { useNavigate } from "react-router-dom";
import StayOverviewCard, { stayShape } from "./StayOverviewCard";

function UpcomingStayCard({ stay }) {
  const navigate = useNavigate();

  return (
    <StayOverviewCard
      cardClassName="upcomingCard"
      title="Your upcoming stay"
      stay={stay}
      actionClassName="stayActionsSecondary"
      onOpenReservation={() => navigate(`/guestdashboard/reservation/${stay.id}`)}
      onBrowseBookings={() => navigate("/guestdashboard/bookings")}
    />
  );
}

UpcomingStayCard.propTypes = {
  stay: stayShape,
};

export default UpcomingStayCard;