import React from "react";
import PropTypes from "prop-types";
import "../../styles/sass/features/guestdashboard/guestDashboard.scss";

function StatsCard({ icon, value, label }) {
  return (
    <div className="statsCard">
      <div className="statsIcon">{icon}</div>

      <div className="statsText">
        <p className="statsValue">{value}</p>
        <p className="statsLabel">{label}</p>
      </div>
    </div>
  );
}

StatsCard.propTypes = {
  icon: PropTypes.node,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  label: PropTypes.string.isRequired,
};

export default StatsCard;