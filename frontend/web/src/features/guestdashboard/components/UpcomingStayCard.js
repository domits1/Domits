import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import StayOverviewCard, { stayShape } from "./StayOverviewCard";
import { LanguageContext } from "../../../context/LanguageContext.js";
import en from "../../../content/en.json";
import nl from "../../../content/nl.json";
import de from "../../../content/de.json";
import es from "../../../content/es.json";
import { buildStayMessageNavigation, buildStayReservationPath } from "./stayCardNavigation";

const contentByLanguage = { en, nl, de, es };

function UpcomingStayCard({ stay }) {
  const navigate = useNavigate();
  const { language } = useContext(LanguageContext);
  const t = contentByLanguage[language]?.guestdashboard;

  const handleMessageHost = () => {
    const messageNavigation = buildStayMessageNavigation(stay);
    navigate(messageNavigation.messagesPath, { state: messageNavigation.state });
  };

  return (
    <StayOverviewCard
      cardClassName="upcomingCard"
      title={t?.stays?.upcomingStay || "Your upcoming stay"}
      stay={stay}
      actionClassName="stayActionsSecondary"
      onOpenReservation={() => navigate(buildStayReservationPath(stay))}
      onMessageHost={handleMessageHost}
      onBrowseBookings={() => navigate("/guestdashboard/bookings")}
    />
  );
}

UpcomingStayCard.propTypes = {
  stay: stayShape,
};

export default UpcomingStayCard;
