import React from "react";
import PropTypes from "prop-types";
import "../../../styles/sass/features/guestdashboard/guestDashboard.scss";

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
    id: PropTypes.number.isRequired,
    image: PropTypes.string,
    name: PropTypes.string,
    dates: PropTypes.string,
  }).isRequired,
};

function PastTrips({ stays = [] }) {
  return (
    <div className="card">
      <div className="cardHeader">
        <h2>Past trips</h2>
        <span className="viewAll">View All &gt;</span>
      </div>

      <div className="pastList">
        {stays.map((stay) => (
          <PastTripItem key={stay.id} stay={stay} />
        ))}
      </div>
    </div>
  );
}

PastTrips.propTypes = {
  stays: PropTypes.arrayOf(PropTypes.object),
};

export default PastTrips;