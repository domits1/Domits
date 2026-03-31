import React from "react";
import styles from "../HostDashboard.module.scss";
import PropTypes from "prop-types";

function ReservationRow({ reservation }) {
  return (
    <tr>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <img
            src={reservation.avatar}
            alt={reservation.guest}
            width="30"
            height="30"
            style={{ borderRadius: "50%" }}
          />
          <span>{reservation.guest}</span>
        </div>
      </td>

      <td>
        <div>
          <div>{reservation.property}</div>
          <small>{reservation.address}</small>
        </div>
      </td>

      <td>{reservation.dates}</td>
      <td style={{ color: "#16a34a", fontWeight: 500 }}>
        {reservation.status}
      </td>
    </tr>
  );
}

ReservationRow.propTypes = {
  reservation: PropTypes.shape({
    id: PropTypes.number.isRequired,
    avatar: PropTypes.string,
    guest: PropTypes.string,
    property: PropTypes.string,
    address: PropTypes.string,
    dates: PropTypes.string,
    status: PropTypes.string,
  }).isRequired,
};

function ReservationsTable({ data = [], isLoading = false }) {
  if (isLoading) {
    return <div className={styles.card}>Loading...</div>;
  }

  return (
    <div className={styles.card}>
      <h2>Upcoming reservations</h2>

      {data.length > 0 ? (
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
            {data.map((reservation) => (
              <ReservationRow key={reservation.id} reservation={reservation} />
            ))}
          </tbody>
        </table>
      ) : (
        <p>No upcoming reservations</p>
      )}
    </div>
  );
}

ReservationsTable.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      avatar: PropTypes.string,
      guest: PropTypes.string,
      property: PropTypes.string,
      address: PropTypes.string,
      dates: PropTypes.string,
      status: PropTypes.string,
    })
  ),
  isLoading: PropTypes.bool,
};

export default ReservationsTable;