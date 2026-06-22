import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import StayOverviewCard, { stayShape } from "./StayOverviewCard";
import { LanguageContext } from "../../../context/LanguageContext.js";
import en from "../../../content/en.json";
import nl from "../../../content/nl.json";
import de from "../../../content/de.json";
import es from "../../../content/es.json";

const contentByLanguage = { en, nl, de, es };

function UpcomingStayCard({ stay }) {
  const navigate = useNavigate();
  const { language } = useContext(LanguageContext);
  const t = contentByLanguage[language]?.guestdashboard;

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
      cardClassName="upcomingCard"
      title={t?.stays?.upcomingStay || "Your upcoming stay"}
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
