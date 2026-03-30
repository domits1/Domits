import React from "react";
import PropTypes from "prop-types";

function CurrentStayCard({ stay }) {
  return (
    <div className="card currentStayCard">
      <h2>Your current stay</h2>

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

      <div className="stayActions">
        <button type="button">Open reservation</button>
        <button type="button">Message host</button>
        <button type="button">Download invoice</button>
      </div>
    </div>
  );
}

CurrentStayCard.propTypes = {
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

export default CurrentStayCard;