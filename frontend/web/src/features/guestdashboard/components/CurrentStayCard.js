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

function CurrentStayCard({ stay }) {
  const navigate = useNavigate();
  const { language } = useContext(LanguageContext);
  const t = contentByLanguage[language]?.guestdashboard;

  const handleMessageHost = () => {
    const messageNavigation = buildStayMessageNavigation(stay);
    navigate(messageNavigation.messagesPath, { state: messageNavigation.state });
  };

  return (
    <StayOverviewCard
      cardClassName="currentStayCard"
      title={t?.stays?.currentStay || "Your current stay"}
      stay={stay}
      actionClassName="stayActions"
      onOpenReservation={() => navigate(buildStayReservationPath(stay))}
      onMessageHost={handleMessageHost}
    />
  );
}

CurrentStayCard.propTypes = {
  stay: stayShape,
};

export default CurrentStayCard;
