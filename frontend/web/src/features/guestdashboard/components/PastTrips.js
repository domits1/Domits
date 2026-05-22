import React, { useContext } from "react";
import PropTypes from "prop-types";
import "../../../styles/sass/features/guestdashboard/guestDashboard.scss";
import { useNavigate } from "react-router-dom";
import { LanguageContext } from "../../../context/LanguageContext.js";
import en from "../../../content/en.json";
import nl from "../../../content/nl.json";
import de from "../../../content/de.json";
import es from "../../../content/es.json";

const contentByLanguage = { en, nl, de, es };

function PastTripItem({ stay }) {
  return (
    <div className="pastItem">
      <img src={stay.image} alt={stay.name} />

      <div>
        <p className="pastName">{stay.name}</p>
        <p className="pastDates">{stay.dates}</p>
      </div>

      <span>&gt;</span>
    </div>
  );
}

PastTripItem.propTypes = {
  stay: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    image: PropTypes.string,
    name: PropTypes.string,
    dates: PropTypes.string,
  }).isRequired,
};

function PastTrips({ stays = [] }) {
  const navigate = useNavigate();
  const { language } = useContext(LanguageContext);
  const t = contentByLanguage[language]?.guestdashboard;

  return (
    <div className="card guest-card--past-trips">
      <div className="cardHeader">
        <h2>{t?.stays?.pastTrips || "Past trips"}</h2>
        <button
          type="button"
          className="viewAll"
          onClick={() => navigate("/guestdashboard/bookings")}
        >
          {t?.stays?.viewAll || "View All >"}
        </button>
      </div>

      <div className="pastList">
        {stays.length === 0 ? <p>{t?.stays?.noPastTrips || "No past trips yet."}</p> : stays.map((stay) => <PastTripItem key={stay.id} stay={stay} />)}
      </div>
    </div>
  );
}

PastTrips.propTypes = {
  stays: PropTypes.arrayOf(PropTypes.object),
};

export default PastTrips;
