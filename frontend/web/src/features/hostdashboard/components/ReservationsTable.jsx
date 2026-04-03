import React from "react";
import styles from "../HostDashboard.module.scss";
import PropTypes from "prop-types";
import PulseBarsLoader from "../../../components/loaders/PulseBarsLoader";

function GuestAvatar({ name, avatar }) {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        width="30"
        height="30"
        style={{ borderRadius: "50%" }}
      />
    );
  }

  const initial = String(name || "G").trim().charAt(0).toUpperCase() || "G";

  return <span className={styles.avatarFallback}>{initial}</span>;
}

GuestAvatar.propTypes = {
  name: PropTypes.string,
  avatar: PropTypes.string,
};

function ReservationRow({ reservation }) {
  return (
    <tr>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <GuestAvatar name={reservation.guest} avatar={reservation.avatar} />
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
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
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
    return (
      <div className={styles.card}>
        <h2>Upcoming reservations</h2>
        <div className={styles.cardLoaderWrap}>
          <PulseBarsLoader message="Loading reservations..." />
        </div>
      </div>
    );
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
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
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