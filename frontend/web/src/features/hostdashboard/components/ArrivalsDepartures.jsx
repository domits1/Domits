import React from "react";
import styles from "../HostDashboard.module.scss";
import PropTypes from "prop-types";
import PulseBarsLoader from "../../../components/loaders/PulseBarsLoader";

function GuestAvatar({ name, avatar }) {
  if (avatar) {
    return <img src={avatar} alt={name} className={styles.avatar} />;
  }

  const initial = String(name || "G").trim().charAt(0).toUpperCase() || "G";

  return <span className={styles.avatarFallback}>{initial}</span>;
}

GuestAvatar.propTypes = {
  name: PropTypes.string,
  avatar: PropTypes.string,
};

function ArrivalItem({ item, fallbackStatus }) {
  const status = item.status || fallbackStatus;

  return (
    <div className={styles.arrivalItem}>
      <div className={styles.arrivalLeft}>
        <GuestAvatar name={item.guest} avatar={item.avatar} />
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
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    avatar: PropTypes.string,
    guest: PropTypes.string,
    property: PropTypes.string,
    dates: PropTypes.string,
    status: PropTypes.string,
  }).isRequired,
  fallbackStatus: PropTypes.string.isRequired,
};

function ArrivalsDepartures({ arrivals = [], departures = [], isLoading = false }) {
  return (
    <div className={styles.card}>
      <h2>Today’s arrivals & departures</h2>

      {isLoading ? (
        <div className={styles.cardLoaderWrap}>
          <PulseBarsLoader message="Loading arrivals and departures..." />
        </div>
      ) : (
        <div className={styles.arrivalsGrid}>
          <div>
            <h4>Check-in today</h4>

            {arrivals.length > 0 ? (
              arrivals.map((item) => (
                <ArrivalItem
                  key={item.id}
                  item={item}
                  fallbackStatus="Checked-in"
                />
              ))
            ) : (
              <p>No arrivals</p>
            )}
          </div>

          <div>
            <h4>Check-out today</h4>

            {departures.length > 0 ? (
              departures.map((item) => (
                <ArrivalItem
                  key={item.id}
                  item={item}
                  fallbackStatus="Checked-out"
                />
              ))
            ) : (
              <p>No departures</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

ArrivalsDepartures.propTypes = {
  arrivals: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      avatar: PropTypes.string,
      guest: PropTypes.string,
      property: PropTypes.string,
      dates: PropTypes.string,
      status: PropTypes.string,
    })
  ),
  departures: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      avatar: PropTypes.string,
      guest: PropTypes.string,
      property: PropTypes.string,
      dates: PropTypes.string,
      status: PropTypes.string,
    })
  ),
  isLoading: PropTypes.bool,
};

export default ArrivalsDepartures;