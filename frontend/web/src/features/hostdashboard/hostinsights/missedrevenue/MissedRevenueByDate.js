import React from "react";
import PropTypes from "prop-types";
import { formatMissedRevenueCurrency } from "./missedRevenueFields";
import tableStyles from "./styles/MissedRevenueTable.module.scss";

export function MissedRevenueByDate({ byDate, currency }) {
  if (byDate.length === 0) {
    return <p>No missed nights in this period.</p>;
  }

  return (
    <table className={tableStyles.table}>
      <thead>
        <tr>
          <th>Date</th>
          <th>Missed revenue</th>
        </tr>
      </thead>
      <tbody>
        {byDate.map((entry) => (
          <tr key={entry.date}>
            <td>{entry.date}</td>
            <td>{formatMissedRevenueCurrency(entry.missedRevenue, currency)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

MissedRevenueByDate.propTypes = {
  byDate: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.string.isRequired,
      missedRevenue: PropTypes.number.isRequired,
    })
  ).isRequired,
  currency: PropTypes.string.isRequired,
};

export default MissedRevenueByDate;
