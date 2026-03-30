import React from "react";
import PropTypes from "prop-types";
import "../../../styles/sass/features/guestdashboard/guestDashboard.scss";

function UpcomingStayCard({ stay }) {
  return (
    <div className="card upcomingCard">
      <div className="cardHeader">
        <h2>Your upcoming stay</h2>
        <span className="viewAll">View All &gt;</span>
      </div>

      <div className="stayInnerCard">
        <img src={stay.image} alt={stay.name} />

        <div className="stayContent">
          <h4 className="stayTitle">{stay.name}</h4>

          <p className="stayLocation">📍 {stay.location}</p>

          <p className="stayDates">{stay.dates}</p>

          <p className="stayMeta">
            Status: <strong className="confirmed">Confirmed</strong>
            <span className="metaSeparator">|</span>
            Total: €{stay.total}
            <span className="metaSeparator">|</span>
            #{stay.reservationNumber}
          </p>
        </div>
      </div>

      <button type="button" className="secondaryBtn">
        Open reservation
      </button>
    </div>
  );
}

UpcomingStayCard.propTypes = {
  stay: PropTypes.shape({
    image: PropTypes.string,
    name: PropTypes.string,
    location: PropTypes.string,
    dates: PropTypes.string,
    total: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    reservationNumber: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
    ]),
  }).isRequired,
};

export default UpcomingStayCard;