import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { notificationTypes } from "./NotificationBell";
import alertStyles from "./Notifications.module.css";
import reviewStyles from "../../review/styles/HostReviews.module.css";
import styles from "./ReviewNotifications.module.css";

const filters = [
  ["all", "All notifications"], ["unread", "Unread notifications"],
  ["review", "New reviews"], ["low", "Low ratings"],
  ["declining", "Declining ratings"], ["overdue", "Overdue responses"],
];
const matches = (alert, filter) => filter === "all" || (filter === "unread" ? !alert.read : alert.type === filter);
const PAGE_SIZE = 5;
const dateValue = (timestamp) => Date.parse(timestamp) || 0;

// Extends the bell alert shape with optional propertyId, rating, previousRating.
// The caller owns fetching and read status; this page performs no requests.
export default function ReviewNotifications({ alerts = [], loading = false, error = false }) {
  const [filter, setFilter] = useState("all");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const list = useRef(null);
  const nextFocus = useRef(null);
  const filtered = alerts.filter((alert) => matches(alert, filter))
    .sort((a, b) => dateValue(b.timestamp) - dateValue(a.timestamp));
  const visible = filtered.slice(0, limit);

  useEffect(() => {
    if (nextFocus.current !== null) {
      list.current?.children[nextFocus.current]?.querySelector("a")?.focus();
      nextFocus.current = null;
    }
  }, [limit]);

  return (
    <section className={`${reviewStyles.page} ${styles.page}`} aria-labelledby="notification-heading"
      aria-busy={loading || undefined}>
      <header className={reviewStyles.pageHeading}>
        <h2 id="notification-heading">Review Notifications</h2>
        <p>View review-related notifications for your properties.</p>
      </header>
      <div className={styles.filters} role="group" aria-label="Filter notifications">
        {filters.map(([value, label]) => (
          <button key={value} type="button" aria-pressed={filter === value} onClick={() => {
            setFilter(value);
            setLimit(PAGE_SIZE);
          }}>{label} ({alerts.filter((alert) => matches(alert, value)).length})</button>
        ))}
      </div>
      {loading ? <p role="status">Loading notifications…</p> : error ?
        <p role="alert">Unable to load notifications. Please try again later.</p> :
        filtered.length === 0 ? <p role="status">{alerts.length ? "No notifications match this filter." : "No review notifications yet."}</p> : (
          <>
            <ul ref={list} className={styles.list} aria-label="Review alerts">
              {visible.map((alert) => {
                const { label, Icon } = notificationTypes[alert.type] || notificationTypes.review;
                const validDate = Number.isFinite(Date.parse(alert.timestamp));
                return (
                  <li key={alert.id} className={styles.row}>
                    <span aria-hidden="true" className={`${alertStyles.icon} ${alertStyles[alert.type] || alertStyles.review}`}><Icon /></span>
                    <div className={styles.description}>
                      <strong>{label}</strong><span>{alert.property}</span><p>{alert.message}</p>
                    </div>
                    <div className={styles.rating}>
                      {Number.isFinite(alert.rating) ? <>
                        <span>Rating: {alert.rating.toFixed(1)} / 5</span>
                        {alert.type === "declining" && Number.isFinite(alert.previousRating) &&
                          <span>Previously {alert.previousRating.toFixed(1)} / 5</span>}
                      </> : <span>No rating available</span>}
                    </div>
                    <div className={styles.received}>
                      {validDate ? <time dateTime={alert.timestamp}>{new Date(alert.timestamp).toLocaleString()}</time> : <span>Date unavailable</span>}
                      <span className={alert.read ? alertStyles.read : alertStyles.unread}>{alert.read ? "Read" : "Unread"}</span>
                    </div>
                    <Link className={styles.action} to={alert.propertyId ?
                      `/hostdashboard/property?ID=${encodeURIComponent(alert.propertyId)}` : "/hostdashboard/reviews"}
                      aria-label={`${alert.propertyId ? "View property" : "View reviews"} for ${alert.property}`}>
                      {alert.propertyId ? "View property" : "View reviews"}<span aria-hidden="true"> ›</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <footer className={styles.footer}>
              <p role="status">Showing {visible.length} of {filtered.length} notifications</p>
              {visible.length < filtered.length && <button type="button" onClick={() => {
                nextFocus.current = visible.length;
                setLimit((current) => current + PAGE_SIZE);
              }}>Load more notifications</button>}
            </footer>
          </>
        )}
    </section>
  );
}
