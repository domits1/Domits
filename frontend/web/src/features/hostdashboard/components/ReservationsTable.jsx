import React from "react";
import styles from "../HostDashboard.module.scss";
import PropTypes from "prop-types";

function ReservationRow({ r }) {
  return (
    <tr>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <img
            src={r.avatar}
            alt=""
            width="30"
            height="30"
            style={{ borderRadius: "50%" }}
          />
          {r.guest}
        </div>
      </td>

      <td>
        <div>
          <div>{r.property}</div>
          <small>{r.address}</small>
        </div>
      </td>

      <td>{r.dates}</td>

      <td style={{ color: "#16a34a", fontWeight: 500 }}>
        {r.status}
      </td>
    </tr>
  );
}

ReservationRow.propTypes = {
  r: PropTypes.shape({
    id: PropTypes.number.isRequired,
    avatar: PropTypes.string,
    guest: PropTypes.string,
    property: PropTypes.string,
    address: PropTypes.string,
    dates: PropTypes.string,
    status: PropTypes.string,
  }).isRequired,
};

function ReservationsTable({ data = [], isLoading }) {
  if (isLoading) return <div className={styles.card}>Loading...</div>;

  return (
    <div className={styles.card}>
      <h2>Upcoming reservations</h2>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Guest</th>
            <th>Property</th>
            <th>Dates</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <ReservationRow key={r.id} r={r} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

ReservationsTable.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object),
  isLoading: PropTypes.bool,
};

export default ReservationsTable;