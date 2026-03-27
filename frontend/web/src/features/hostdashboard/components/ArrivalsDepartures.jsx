import React from "react";
import styles from "../HostDashboard.module.scss";

function ArrivalsDepartures({ data = [] }) {
  const checkIns = data.slice(0, 2);
  const checkOuts = data.slice(2, 3);

  return (
    <div className={styles.card}>
      <h3>Today’s arrivals & departures</h3>

      <div className={styles.arrivalsGrid}>
        {/* Check-ins */}
        <div>
          <h4>Check-in today</h4>
          {checkIns.length > 0 ? (
            checkIns.map((item, i) => (
              <div key={i} className={styles.arrivalItem}>
                <div>
                  <strong>{item?.guestName || "Guest"}</strong>
                  <p>{item?.property?.title || item?.location?.city || "Property"}</p>
                </div>
                <span className={styles.status}>Check-in</span>
              </div>
            ))
          ) : (
            <p>No arrivals</p>
          )}
        </div>

        {/* Check-outs */}
        <div>
          <h4>Check-out today</h4>
          {checkOuts.length > 0 ? (
            checkOuts.map((item, i) => (
              <div key={i} className={styles.arrivalItem}>
                <div>
                  <strong>{item?.guestName || "Guest"}</strong>
                  <p>{item?.property?.title || item?.location?.city || "Property"}</p>
                </div>
                <span className={styles.status}>Check-out</span>
              </div>
            ))
          ) : (
            <p>No departures</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ArrivalsDepartures;