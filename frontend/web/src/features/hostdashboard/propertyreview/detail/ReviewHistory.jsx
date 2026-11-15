import React from "react";
import { buildReviewHistoryRows } from "./reviewHistoryFormat";
import styles from "./ReviewHistory.module.css";

function ReviewHistory({ history, hostId }) {
  const rows = buildReviewHistoryRows(history, hostId);
  const hasRows = rows.length > 0;

  return (
    <section className={styles.history}>
      <h2 className={styles.title}>Review history</h2>
      {!hasRows && <p className={styles.empty}>No review history yet.</p>}
      {hasRows && (
        <ol className={styles.list}>
          {rows.map((row) => (
            <li key={row.key} className={styles.row}>
              <div className={styles.head}>
                <strong>{row.label}</strong>
                <time className={styles.meta} dateTime={row.iso}>
                  {row.when}
                </time>
              </div>
              <p className={styles.meta}>
                <span>{row.actor}</span> · <span>{row.transition}</span>
              </p>
              {row.reason && <blockquote className={styles.reason}>{row.reason}</blockquote>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default ReviewHistory;
