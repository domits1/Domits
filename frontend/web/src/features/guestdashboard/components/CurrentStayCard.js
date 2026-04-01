import React from "react";
import { useNavigate } from "react-router-dom";
import StayOverviewCard, { stayShape } from "./StayOverviewCard";

function CurrentStayCard({ stay }) {
  const navigate = useNavigate();

  return (
    <StayOverviewCard
      cardClassName="currentStayCard"
      title="Your current stay"
      stay={stay}
      actionClassName="stayActions"
      onOpenReservation={() => navigate(`/guestdashboard/reservation/${stay.id}`)}
    />
  );
}

CurrentStayCard.propTypes = {
  stay: stayShape,
};

export default CurrentStayCard;