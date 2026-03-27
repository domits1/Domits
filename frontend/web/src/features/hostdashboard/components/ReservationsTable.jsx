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
  {data.map((r) => (
    <tr key={r.id}>
      
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
  ))}
</tbody>
      </table>
    </div>
  );
}

export default ReservationsTable;