import React from "react";
import styles from "../HostDashboard.module.scss";

function ReservationsTable({ data = [], isLoading }) {
  if (isLoading) return <div className={styles.card}>Loading...</div>;

  return (
    <div className={styles.card}>
      <h3>Upcoming reservations</h3>

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
          {data.length > 0 ? (
            data.slice(0, 5).map((item, i) => (
              <tr key={i}>
                <td>{item?.guestName || "Guest"}</td>
                <td>{item?.property?.title || item?.location?.city || "Property"}</td>
                <td>
                  {item?.checkIn || "--"} – {item?.checkOut || "--"}
                </td>
                <td className={styles.status}>
                  {item?.status || "Confirmed"}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4">No reservations found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ReservationsTable;