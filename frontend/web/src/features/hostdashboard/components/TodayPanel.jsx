import React from "react";
import styles from "../HostDashboard.module.scss";
import PropTypes from "prop-types";
import PulseBarsLoader from "../../../components/loaders/PulseBarsLoader";

function TodayPanel({ data, loadingByItem = {} }) {
  const formatValue = (value) => (value == null ? "—" : value);

  const items = [
    { label: "Check-ins", value: data?.checkins ?? 0, isLoading: loadingByItem.checkins },
    { label: "Check-outs", value: data?.checkouts ?? 0, isLoading: loadingByItem.checkouts },
    { label: "Messages", value: formatValue(data?.messages), isLoading: loadingByItem.messages },
    { label: "Tasks", value: data?.tasks ?? 0, isLoading: loadingByItem.tasks },
  ];

  return (
    <div className={styles.card}>
      <h2>Today</h2>

      {items.map((item) => (
        <div key={item.label} className={styles.todayItem}>
          <span>{item.label}</span>
          {item.isLoading ? (
            <PulseBarsLoader inline message="" />
          ) : (
            <strong>{item.value}</strong>
          )}
        </div>
      ))}
    </div>
  );
}

TodayPanel.propTypes = {
  data: PropTypes.shape({
    checkins: PropTypes.number,
    checkouts: PropTypes.number,
    messages: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    tasks: PropTypes.number,
  }),
  loadingByItem: PropTypes.shape({
    checkins: PropTypes.bool,
    checkouts: PropTypes.bool,
    messages: PropTypes.bool,
    tasks: PropTypes.bool,
  }),
};

export default TodayPanel;