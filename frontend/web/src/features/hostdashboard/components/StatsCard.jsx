import React from "react";
import styles from "../HostDashboard.module.scss";
import PropTypes from "prop-types";

function StatsCard({ icon, value, label }) {
  return (
    <div className={styles.statsCard}>
      <div className={styles.statsIcon}>{icon}</div>
      <div>
        <p className={styles.statsValue}>{value}</p>
        <p className={styles.statsLabel}>{label}</p>
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