import React from "react";
import styles from "../HostDashboard.module.scss";
import PropTypes from "prop-types";

function ArrivalItem({ item, status }) {
  return (
    <div className={styles.arrivalItem}>
      <div className={styles.arrivalLeft}>
        <img src={item.avatar} alt="" className={styles.avatar} />
        <div>
          <strong>{item.guest}</strong>
          <p className={styles.subText}>{item.property}</p>
        </div>
      </div>

      <div className={styles.arrivalRight}>
        <span className={styles.date}>{item.dates}</span>
        <span className={styles.statusBadge}>{status}</span>
      </div>
    </div>
  );
}

ArrivalItem.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.number.isRequired,
    avatar: PropTypes.string,
    guest: PropTypes.string,
    property: PropTypes.string,
    dates: PropTypes.string,
  }).isRequired,
  status: PropTypes.string.isRequired,
};

function ArrivalsDepartures({ arrivals = [], departures = [] }) {
  return (
    <div className={styles.card}>
      <h2>Today’s arrivals & departures</h2>

      <div className={styles.arrivalsGrid}>
        <div>
          <h4>Check-in today</h4>

          {arrivals.length > 0 ? (
            arrivals.map((item) => (
              <ArrivalItem key={item.id} item={item} status="Checked-in" />
            ))
          ) : (
            <p>No arrivals</p>
          )}
        </div>

        <div>
          <h4>Check-out today</h4>

          {departures.length > 0 ? (
            departures.map((item) => (
              <ArrivalItem key={item.id} item={item} status="Checked-out" />
            ))
          ) : (
            <p>No departures</p>
          )}
        </div>
      </div>
    </div>
  );
}

ArrivalsDepartures.propTypes = {
  arrivals: PropTypes.arrayOf(PropTypes.object),
  departures: PropTypes.arrayOf(PropTypes.object),
};

export default ArrivalsDepartures;