import React from "react";
import styles from "../HostDashboard.module.scss";

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

export default StatsCard;