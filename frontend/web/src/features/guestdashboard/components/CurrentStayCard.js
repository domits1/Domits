import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import StayOverviewCard, { stayShape } from "./StayOverviewCard";
import { LanguageContext } from "../../../context/LanguageContext.js";
import en from "../../../content/en.json";
import nl from "../../../content/nl.json";
import de from "../../../content/de.json";
import es from "../../../content/es.json";

const contentByLanguage = { en, nl, de, es };

function CurrentStayCard({ stay }) {
  const navigate = useNavigate();
  const { language } = useContext(LanguageContext);
  const t = contentByLanguage[language]?.guestdashboard;

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
      cardClassName="currentStayCard"
      title={t?.stays?.currentStay || "Your current stay"}
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
