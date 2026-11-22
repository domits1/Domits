import React, { useEffect, useId, useRef, useState } from "react";
import { FiBell, FiStar, FiTrendingDown, FiClock, FiFlag, FiCheckSquare, FiSend, FiXCircle, FiMessageSquare } from "react-icons/fi";
import styles from "./Notifications.module.css";
import { useReviewAlerts } from "./ReviewAlertsProvider";

export const notificationTypes = {
  approved: { label: "Review approved", Icon: FiCheckSquare }, rejected: { label: "Review rejected", Icon: FiXCircle },
  published: { label: "Review published", Icon: FiStar }, responded: { label: "Host responded", Icon: FiMessageSquare },
  approval: { label: "Review pending approval", Icon: FiCheckSquare },
  flagged: { label: "Review flagged", Icon: FiFlag },
  publication: { label: "Review pending publication", Icon: FiSend },
  review: { label: "New review", Icon: FiStar },
  low: { label: "Low rating", Icon: FiStar },
  declining: { label: "Declining ratings", Icon: FiTrendingDown },
  overdue: { label: "Overdue response", Icon: FiClock },
};

// Alert shape: { id, type, property, message, timestamp (ISO), read }.
export function NotificationDropdown({ id, alerts, loading, error, panelRef, refresh, live }) {
  return (
    <section id={id} ref={panelRef} tabIndex={-1} aria-label="Review notifications"
      className={styles.dropdown} aria-busy={loading || undefined}>
      <h2>{(live?.administrator || live?.guest) ? "Review Notifications" : "Notifications"}</h2>
      {loading ? <output>Loading notifications…</output> : error ?
        <p role="alert">Unable to load notifications. Please try again later. {refresh && <button onClick={refresh}>Retry</button>}</p> :
        alerts.length === 0 ? <output>No notifications yet.</output> : (
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
                    {(live?.administrator || live?.guest) && <div className={styles.actions}>
                      <a href={alert.destination}>Review</a>
                      <button disabled={live.pending || live.loading || alert.read} onClick={() => live.update(alert.id, "read")}>Mark as read</button>
                      <button disabled={live.pending || live.loading} onClick={async () => { await live.update(alert.id, "dismiss"); panelRef?.current?.focus(); }}>Dismiss</button>
                    </div>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      <a className={styles.viewAll} href={live?.guest ? "/guestdashboard/review-notifications" : live?.administrator ? "/hostdashboard/admin/review-approval?notifications=1" : "/hostdashboard/review-notifications"}>View all notifications</a>
    </section>
  );
}

export default function NotificationBell({ alerts = [], loading = false, error = false, onOpen }) {
  const live = useReviewAlerts();
  if (live) { alerts = live.alerts; loading = live.loading; error = live.error; }
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const bell = useRef(null);
  const panel = useRef(null);
  const id = useId();
  const unread = live ? live.unreadCount : alerts.filter((alert) => !alert.read).length;

  useEffect(() => {
    if (!open) return undefined;
    panel.current?.focus();
    const outside = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  if ((live?.administrator && !live.allowed) || (live?.guest && live.authorizationError)) return null;
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
        aria-label={live?.guest && (live.loading || live.countLoading || live.countError) ? `Review notifications, ${live.loading || live.countLoading ? "counting unread" : "count unavailable"}` : `Review notifications, ${unread} unread`} aria-expanded={open}
        aria-controls={open ? id : undefined} onClick={() => {
          if (!open) onOpen?.();
          setOpen(!open);
        }}>
        <FiBell aria-hidden="true" />
        {unread > 0 && !live?.countLoading && !live?.countError && !(live?.guest && live.loading) && <span className={styles.badge} aria-hidden="true">{unread > 99 ? "99+" : unread}</span>}
      </button>
      {open && <NotificationDropdown id={id} panelRef={panel} alerts={alerts} loading={loading} error={error} refresh={live?.refresh} live={live} />}
    </div>
  );
}
