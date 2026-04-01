import React from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";

function UpcomingStayCard({ stay }) {
  const navigate = useNavigate();

  const handleOpenReservation = () => {
    navigate(`/guestdashboard/reservation/${stay.id}`);
  };

  return (
    <div className="card upcomingCard">
      <div className="cardHeader">
        <h2>Your upcoming stay</h2>
        <span
          className="viewAll"
          onClick={() => navigate("/guestdashboard/bookings")}
        >
          View All &gt;
        </span>
      </div>

      <div className="stayInnerCard">
        <img src={stay.image} alt={stay.name} />

        <div className="stayContent">
          <h3 className="stayTitle">{stay.name}</h3>

          <p className="stayLocation">{stay.location}</p>

          <h4 className="stayDates">{stay.dates}</h4>

          <div className="stayDivider" />

          <p className="stayMeta">
            Status: <strong>Confirmed</strong>
            <span className="metaSeparator">|</span>
            €{stay.total}
            <span className="metaSeparator">|</span>
            Ref: {stay.reservationNumber}
          </p>
        </div>
      </div>

      <div className="stayActionsSecondary">
        <button type="button" onClick={handleOpenReservation}>
          Open reservation
        </button>
        <button type="button">Message host</button>
        <button type="button">Download invoice</button>
      </div>
    </div>
  );
}

UpcomingStayCard.propTypes = {
  stay: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
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