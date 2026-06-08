import React, { useContext } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import "../../../styles/sass/features/guestdashboard/guestDashboard.scss";
import { LanguageContext } from "../../../context/LanguageContext.js";
import en from "../../../content/en.json";
import nl from "../../../content/nl.json";
import de from "../../../content/de.json";
import es from "../../../content/es.json";

const contentByLanguage = { en, nl, de, es };

function CancelledTripItem({ stay }) {
  const navigate = useNavigate();

  const handleClick = () => {
    const id = stay.bookingId || stay.id;
    if (id) {
      navigate(`/guestdashboard/reservation/${encodeURIComponent(id)}`);
    }
  };

  return (
    <button type="button" className="pastItem" onClick={handleClick}>
      <img src={stay.image} alt={stay.name} />

      <div>
        <p className="pastName">{stay.name}</p>
        <p className="pastDates">{stay.dates}</p>
      </div>

      <span>&gt;</span>
    </button>
  );
}

CancelledTripItem.propTypes = {
  stay: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    image: PropTypes.string,
    name: PropTypes.string,
    dates: PropTypes.string,
    bookingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }).isRequired,
};

function CancelledTrips({ stays = [] }) {
  const navigate = useNavigate();
  const { language } = useContext(LanguageContext);
  const t = contentByLanguage[language]?.guestdashboard;

  return (
    <div className="card guest-card--cancelled">
      <div className="cardHeader">
        <h2>{t?.stays?.cancelledTrips || "Cancelled trips"}</h2>
        <button type="button" className="viewAll" onClick={() => navigate("/guestdashboard/bookings")}>
          {t?.stays?.viewAll || "View All >"}
        </button>
      </div>

      <div className="pastList">
        {stays.length === 0 ? (
          <p>{t?.stays?.noCancelledTrips || "No cancelled trips yet."}</p>
        ) : (
          stays.map((stay) => <CancelledTripItem key={stay.id} stay={stay} />)
        )}
      </div>
    </div>
  );
}

CancelledTrips.propTypes = {
  stays: PropTypes.arrayOf(PropTypes.object),
};

export default CancelledTrips;
