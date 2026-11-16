import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { notificationTypes } from "./NotificationBell";
import alertStyles from "./Notifications.module.css";
import reviewStyles from "../../review/styles/HostReviews.module.css";
import styles from "./ReviewNotifications.module.css";
import { useReviewAlerts } from "./ReviewAlertsProvider";
import { FiCheck, FiSearch, FiTrash2 } from "react-icons/fi";

const filters = [
  ["all", "All notifications"], ["unread", "Unread notifications"],
  ["review", "New reviews"], ["low", "Low ratings"],
  ["declining", "Declining ratings"], ["overdue", "Overdue responses"],
];
const matches = (alert, filter) => filter === "all" || (filter === "unread" ? !alert.read : alert.type === filter);
const PAGE_SIZE = 5;
const dateValue = (timestamp) => Date.parse(timestamp) || 0;
const notificationData = (live, alerts, loading, error) => live ?
  { alerts: live.alerts, loading: live.loading && !live.alerts.length, error: live.error } : { alerts, loading, error };
const toggleSelection = (selected, id, checked) => {
  const next = new Set(selected);
  if (checked) { next.add(id); } else { next.delete(id); }
  return next;
};

// Extends the bell alert shape with optional propertyId, rating, previousRating.
// The caller owns fetching and read status; this page performs no requests.
export default function ReviewNotifications({ alerts = [], loading = false, error = false }) {
  const live = useReviewAlerts();
  ({ alerts, loading, error } = notificationData(live, alerts, loading, error));
  const [filter, setFilter] = useState("all");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [bulkPending, setBulkPending] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState(""), [property, setProperty] = useState(""), [days, setDays] = useState(0);
  const list = useRef(null);
  const nextFocus = useRef(null);
  const dismissFocus = useRef(false);
  const filtered = alerts.filter((alert) => matches(alert, filter) && (!property || alert.propertyId === property)
    && `${alert.property} ${alert.message}`.toLowerCase().includes(search.toLowerCase())
    && (!days || dateValue(alert.timestamp) >= Date.now() - days * 86400000))
    .sort((a, b) => dateValue(b.timestamp) - dateValue(a.timestamp));
  const visible = filtered.slice(0, limit);
  // Without a selection, bulk actions follow the active filters so hidden alerts are never touched.
  const targets = selected.size ? alerts.filter((a) => selected.has(a.id)) : filtered;
  const scope = selected.size ? "selected" : "matching";
  const bulk = async (action) => {
    setBulkPending(true);
    for (const alert of targets.filter((a) => action === "read" ? !a.read : a.read)) {
      if (!(await live.update(alert.id, action))) break;
    }
    setBulkPending(false);
    setSelected(new Set());
  };

  useEffect(() => {
    if (nextFocus.current !== null) {
      const link = list.current?.children[nextFocus.current]?.querySelector("a");
      if (link) { link.focus(); nextFocus.current = null; }
    }
  }, [limit, visible.length]);
  useEffect(() => {
    if (dismissFocus.current && !live?.pending) {
      list.current?.querySelector("a, button:not([disabled])")?.focus();
      dismissFocus.current = false;
    }
  }, [live?.pending]);

  return (
    <section className={`${reviewStyles.page} ${styles.page}`} aria-labelledby="notification-heading"
      aria-busy={loading || undefined}>
      <header className={reviewStyles.pageHeading}>
        <h2 id="notification-heading">Review Notifications</h2>
        <p>View and manage all review-related notifications for your properties.</p>
        {live && <div className={`${styles.tools} ${styles.bulkActions}`}>
          <button className={styles.action} disabled={bulkPending || live.loading || live.pending || !targets.some((a) => !a.read)} onClick={() => bulk("read")}><FiCheck aria-hidden="true" /> Mark {scope} alerts as read</button>
          <button className={styles.action} disabled={bulkPending || live.loading || live.pending || !targets.some((a) => a.read)} onClick={() => bulk("dismiss")}><FiTrash2 aria-hidden="true" /> Dismiss {scope} read alerts</button>
        </div>}
      </header>
      <div className={styles.filters} role="group" aria-label="Filter notifications">
        {filters.map(([value, label]) => (
          <button key={value} type="button" aria-pressed={filter === value} onClick={() => {
            setFilter(value);
            setLimit(PAGE_SIZE);
          }}>{label} ({alerts.filter((alert) => matches(alert, value)).length})</button>
        ))}
      </div>
      {live && <p>Filters apply to loaded alerts.</p>}
      <div className={styles.tools} onChange={() => setLimit(PAGE_SIZE)}>
        <div className={styles.search}>
          <FiSearch aria-hidden="true" className={styles.searchIcon} />
          <input type="search" aria-label="Search notifications" placeholder="Search notifications…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select aria-label="Filter by property" value={property} onChange={(e) => setProperty(e.target.value)}>
          <option value="">All properties</option>{[...new Map(alerts.filter((a) => a.propertyId).map((a) => [a.propertyId, a.property])).entries()].map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <select aria-label="Filter by time" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={0}>All time</option><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option>
        </select>
      </div>
      {live && error && !live.authorizationError && <p role="alert">{error} <button onClick={live.refresh} disabled={live.loading || live.pending}>Retry</button></p>}
      {loading ? <output>Loading notifications…</output> : error && !live ?
        <p role="alert">Unable to load notifications. Please try again later.</p> :
        filtered.length === 0 ? <><output>{alerts.length ? "No notifications match this filter." : "No notifications yet."}</output>
          {live?.hasMore && <button disabled={live.loading || live.pending} onClick={live.loadMore}>Load more notifications</button>}</> : (
          <>
            <div className={`${styles.row} ${styles.tableHeading}`}><input type="checkbox" aria-label="Select visible notifications" checked={visible.length > 0 && visible.every((a) => selected.has(a.id))}
              onChange={(e) => setSelected(e.target.checked ? new Set(visible.map((a) => a.id)) : new Set())} /><strong>Notification</strong><strong>Rating</strong><strong>Received / Status</strong><strong>Actions</strong></div>
            <ul ref={list} className={styles.list} aria-label="Review alerts">
              {visible.map((alert) => {
                const { label, Icon } = notificationTypes[alert.type] || notificationTypes.review;
                const validDate = Number.isFinite(Date.parse(alert.timestamp));
                return (
                  <li key={alert.id} className={`${styles.row} ${!alert.read ? styles.unreadRow : ""}`}>
                    <input type="checkbox" aria-label={`Select notification ${alert.id} for ${alert.property}`} checked={selected.has(alert.id)}
                      onChange={(e) => setSelected(toggleSelection(selected, alert.id, e.target.checked))} />
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
                    <div className={styles.actions}><Link className={styles.action} to={alert.propertyId ?
                      `/hostdashboard/property?ID=${encodeURIComponent(alert.propertyId)}` : "/hostdashboard/reviews"}
                      aria-label={`${alert.propertyId ? "View property" : "View reviews"} for ${alert.property}`}>
                      {alert.propertyId ? "View property" : "View reviews"}<span aria-hidden="true"> ›</span>
                    </Link>
                    {live && <>
                      <button className={styles.action} disabled={live.pending || live.loading || alert.read} onClick={() => live.update(alert.id, "read")} aria-label={`Mark notification for ${alert.property} as read`}><FiCheck aria-hidden="true" /></button>
                      <button className={styles.action} disabled={live.pending || live.loading} onClick={() => { dismissFocus.current = true; live.update(alert.id, "dismiss"); }} aria-label={`Dismiss notification for ${alert.property}`}><FiTrash2 aria-hidden="true" /></button>
                    </>}</div>
                  </li>
                );
              })}
            </ul>
            <footer className={styles.footer}>
              <output>Showing {visible.length} of {filtered.length} notifications</output>
              {(visible.length < filtered.length || live?.hasMore) && <button type="button" disabled={live?.loading || live?.pending} onClick={() => {
                nextFocus.current = visible.length;
                setLimit((current) => current + PAGE_SIZE);
                if (visible.length >= filtered.length && live?.hasMore) live.loadMore();
              }}>Load more notifications</button>}
            </footer>
          </>
        )}
    </section>
  );
}
