import React from "react";
import styles from "../HostDashboard.module.scss";

function ArrivalsDepartures({ arrivals = [], departures = [] }) {
  return (
    <div className={styles.card}>
      <h3>Today’s arrivals & departures</h3>

      <div className={styles.arrivalsGrid}>

        {/* Check-ins */}
        <div>
          <h4>Check-in today</h4>

          {arrivals.length > 0 ? (
            arrivals.map((item) => (
              <div key={item.id} className={styles.arrivalItem}>

                <div className={styles.arrivalLeft}>
                  <img
                    src={item.avatar}
                    alt=""
                    className={styles.avatar}
                  />

                  <div>
                    <strong>{item.guest}</strong>
                    <p className={styles.subText}>{item.property}</p>
                  </div>
                </div>

                <div className={styles.arrivalRight}>
                  <span className={styles.date}>{item.dates}</span>
                  <span className={styles.statusBadge}>Checked-in</span>
                </div>

              </div>
            ))
          ) : (
            <p>No arrivals</p>
          )}
        </div>

        <div>
          <h4>Check-out today</h4>

          {departures.length > 0 ? (
            departures.map((item) => (
              <div key={item.id} className={styles.arrivalItem}>

                <div className={styles.arrivalLeft}>
                  <img
                    src={item.avatar}
                    alt=""
                    className={styles.avatar}
                  />

                  <div>
                    <strong>{item.guest}</strong>
                    <p className={styles.subText}>{item.property}</p>
                  </div>
                </div>

                <div className={styles.arrivalRight}>
                  <span className={styles.date}>{item.dates}</span>
                  <span className={styles.statusBadge}>Checked-out</span>
                </div>

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