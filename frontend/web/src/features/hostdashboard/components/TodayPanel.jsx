import React from "react";
import styles from "../HostDashboard.module.scss";
import PropTypes from "prop-types";

function TodayPanel({ data }) {
  const items = [
    { label: "Check-ins", value: data?.checkins ?? 0 },
    { label: "Check-outs", value: data?.checkouts ?? 0 },
    { label: "Messages", value: data?.messages ?? 0 },
    { label: "Tasks", value: data?.tasks ?? 0 },
  ];

  return (
    <div className={styles.card}>
      <h2>Today</h2>

      {items.map((item) => (
        <div key={item.label} className={styles.todayItem}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

TodayPanel.propTypes = {
  data: PropTypes.shape({
    checkins: PropTypes.number,
    checkouts: PropTypes.number,
    messages: PropTypes.number,
    tasks: PropTypes.number,
  }),
};

export default TodayPanel;