import React from "react";
import styles from "../HostDashboard.module.scss";

function TodayPanel({ data }) {
  return (
    <div className={styles.card}>
      <h3>Today</h3>

      <div className={styles.todayItem}>
        <span>Check-ins</span>
        <strong>{data?.checkIns || 0}</strong>
      </div>

      <div className={styles.todayItem}>
        <span>Check-outs</span>
        <strong>{data?.checkOuts || 0}</strong>
      </div>

      <div className={styles.todayItem}>
        <span>Messages</span>
        <strong>{data?.messages || 0}</strong>
      </div>

      <div className={styles.todayItem}>
        <span>Tasks</span>
        <strong>{data?.tasks || 0}</strong>
      </div>
    </div>
  );
}

export default TodayPanel;