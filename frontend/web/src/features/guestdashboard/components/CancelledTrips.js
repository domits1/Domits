import React from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import "../../../styles/sass/features/guestdashboard/guestDashboard.scss";

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
  }).isRequired,
};

function CancelledTrips({ stays = [] }) {
  const navigate = useNavigate();

  return (
    <div className="card guest-card--cancelled">
      <div className="cardHeader">
        <h2>Cancelled trips</h2>
        <button type="button" className="viewAll" onClick={() => navigate("/guestdashboard/bookings")}>
          View All &gt;
        </button>
      </div>

      <div className="pastList">
        {stays.length === 0 ? (
          <p>No cancelled trips yet.</p>
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
