import React, { useEffect, useId, useRef, useState } from "react";
import { FiBell, FiStar, FiTrendingDown, FiClock } from "react-icons/fi";
import styles from "./Notifications.module.css";

export const notificationTypes = {
  review: { label: "New review", Icon: FiStar },
  low: { label: "Low rating", Icon: FiStar },
  declining: { label: "Declining ratings", Icon: FiTrendingDown },
  overdue: { label: "Overdue response", Icon: FiClock },
};

// Alert shape: { id, type, property, message, timestamp (ISO), read }.
export function NotificationDropdown({ id, alerts, loading, error, panelRef }) {
  return (
    <section id={id} ref={panelRef} tabIndex={-1} aria-label="Review notifications"
      className={styles.dropdown} aria-busy={loading || undefined}>
      <h2>Notifications</h2>
      {loading ? <p role="status">Loading notifications…</p> : error ?
        <p role="alert">Unable to load notifications. Please try again later.</p> :
        alerts.length === 0 ? <p role="status">No notifications yet.</p> : (
          <ul className={styles.list}>
            {alerts.map((alert) => {
              const { label, Icon } = notificationTypes[alert.type] || notificationTypes.review;
              return (
                <li key={alert.id} className={styles.item}>
                  <span className={`${styles.icon} ${styles[alert.type] || styles.review}`} aria-hidden="true"><Icon /></span>
                  <div className={styles.content}>
                    <div className={styles.meta}><strong>{label}</strong>
                      <span className={alert.read ? styles.read : styles.unread}>{alert.read ? "Read" : "Unread"}</span>
                    </div>
                    <span>{alert.property}</span>
                    <p>{alert.message}</p>
                    <time dateTime={alert.timestamp}>{new Date(alert.timestamp).toLocaleString()}</time>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      <a className={styles.viewAll} href="/hostdashboard/review-notifications">View all notifications</a>
    </section>
  );
}

export default function NotificationBell({ alerts = [], loading = false, error = false, onOpen }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const bell = useRef(null);
  const panel = useRef(null);
  const id = useId();
  const unread = alerts.filter((alert) => !alert.read).length;

  useEffect(() => {
    if (!open) return undefined;
    panel.current?.focus();
    const outside = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  return (
    <div className={styles.root} ref={root} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }} onKeyDown={(event) => {
      if (event.key === "Escape" && open) {
        event.stopPropagation();
        setOpen(false);
        bell.current?.focus();
      }
    }}>
      <button type="button" ref={bell} className={styles.bell}
        aria-label={`Review notifications, ${unread} unread`} aria-expanded={open}
        aria-controls={open ? id : undefined} onClick={() => {
          if (!open) onOpen?.();
          setOpen(!open);
        }}>
        <FiBell aria-hidden="true" />
        {unread > 0 && <span className={styles.badge} aria-hidden="true">{unread > 99 ? "99+" : unread}</span>}
      </button>
      {open && <NotificationDropdown id={id} panelRef={panel} alerts={alerts} loading={loading} error={error} />}
    </div>
  );
}
