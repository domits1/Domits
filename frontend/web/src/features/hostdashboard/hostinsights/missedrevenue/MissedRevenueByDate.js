import React from "react";
import PropTypes from "prop-types";
import tableStyles from "./styles/MissedRevenueTable.module.scss";

export function MissedRevenueByDate({ byDate }) {
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
            <td>EUR {entry.missedRevenue.toFixed(2)}</td>
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
};

export default MissedRevenueByDate;
