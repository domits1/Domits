import React from "react";
import PropTypes from "prop-types";
import "../../../styles/sass/features/guestdashboard/guestDashboard.scss";
import { useNavigate } from "react-router-dom";

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

  return (
    <div className="card">
      <div className="cardHeader">
        <h2>Past trips</h2>
        <button
          type="button"
          className="viewAll"
          onClick={() => navigate("/guestdashboard/bookings")}
        >
          View All &gt;
        </button>
      </div>

      <div className="pastList">
        {stays.length === 0 ? <p>No past trips yet.</p> : stays.map((stay) => <PastTripItem key={stay.id} stay={stay} />)}
      </div>
    </div>
  );
}

PastTrips.propTypes = {
  stays: PropTypes.arrayOf(PropTypes.object),
};

export default PastTrips;