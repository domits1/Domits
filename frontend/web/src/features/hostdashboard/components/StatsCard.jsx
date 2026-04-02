import React from "react";
import styles from "../HostDashboard.module.scss";
import PropTypes from "prop-types";
import PulseBarsLoader from "../../../components/loaders/PulseBarsLoader";

function StatsCard({ icon, value, label, isLoading = false, onClick }) {
  const className = `${styles.statsCard} ${onClick ? styles.statsCardButton : ""}`;

  const content = (
    <>
      {icon && <div className={styles.statsIcon}>{icon}</div>}
      <div>
        {isLoading ? (
          <PulseBarsLoader inline message="" />
        ) : (
          <p className={styles.statsValue}>{value ?? 0}</p>
        )}
        <p className={styles.statsLabel}>{label}</p>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}

StatsCard.propTypes = {
  icon: PropTypes.node,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  label: PropTypes.string.isRequired,
  isLoading: PropTypes.bool,
  onClick: PropTypes.func,
};

export default StatsCard;
