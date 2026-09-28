import React from "react";
import PropTypes from "prop-types";
import { ROOT_CAUSE_KEYS } from "./missedRevenueFields";
import styles from "./styles/MissedRevenueRootCause.module.scss";

// These are contributing-factor signals present on a missed night, not proof of what stopped the booking.
const ROOT_CAUSE_LABELS = Object.freeze({
  restriction: "Restriction (closed to arrival or departure, or a minimum stay)",
  pricing: "Pricing (priced well below your own average rate)",
  occupancy: "Occupancy (no restriction or pricing signal)",
});

export function MissedRevenueRootCause({ rootCause }) {
  const totalNights = ROOT_CAUSE_KEYS.reduce((sum, causeKey) => sum + rootCause[causeKey].nights, 0);

  if (totalNights === 0) {
    return <p>No missed nights in this period.</p>;
  }

  return (
    <table className={styles.rootCauseTable}>
      <thead>
        <tr>
          <th>Cause</th>
          <th>Missed revenue</th>
          <th>Nights</th>
        </tr>
      </thead>
      <tbody>
        {ROOT_CAUSE_KEYS.map((causeKey) => (
          <tr key={causeKey}>
            <td>{ROOT_CAUSE_LABELS[causeKey]}</td>
            <td>EUR {rootCause[causeKey].missedRevenue.toFixed(2)}</td>
            <td>{rootCause[causeKey].nights}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const causeShape = PropTypes.shape({
  missedRevenue: PropTypes.number.isRequired,
  nights: PropTypes.number.isRequired,
});

MissedRevenueRootCause.propTypes = {
  rootCause: PropTypes.shape({
    restriction: causeShape.isRequired,
    pricing: causeShape.isRequired,
    occupancy: causeShape.isRequired,
  }).isRequired,
};

export default MissedRevenueRootCause;
