import React from "react";
import ReviewQueueCard from "./ReviewQueueCard";
import usePropertyReviewQueue from "./usePropertyReviewQueue";
import { describeQueueError } from "./reviewQueueFormat";
import styles from "./PropertyReviewQueue.module.css";

function QueueError({ error, onRetry }) {
  const { message, canRetry } = describeQueueError(error);

  return (
    <div className={styles.error} role="alert">
      <p className={styles.errorMessage}>{message}</p>
      {canRetry && (
        <button type="button" className={styles.button} onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

function PropertyReviewQueue() {
  const { items, nextCursor, loading, loadingMore, error, loadMoreError, loadMore, retry } = usePropertyReviewQueue();

  if (loading) {
    return (
      <p className={styles.statusText} role="status">
        Loading the queue…
      </p>
    );
  }

  if (error) {
    return <QueueError error={error} onRetry={retry} />;
  }

  const hasCards = items.length > 0;
  const hasMore = Boolean(nextCursor);

  if (!hasCards && !hasMore) {
    return <p className={styles.statusText}>No properties waiting for review.</p>;
  }

  const showLoadMore = hasMore && !loadMoreError;

  return (
    <>
      <ul className={styles.grid}>
        {items.map((card) => (
          <li key={card.property.id} className={styles.gridItem}>
            <ReviewQueueCard card={card} />
          </li>
        ))}
      </ul>
      {loadMoreError && <QueueError error={loadMoreError} onRetry={loadMore} />}
      {showLoadMore && (
        <button type="button" className={styles.button} onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? "Loading…" : "Load more"}
        </button>
      )}
    </>
  );
}

export default PropertyReviewQueue;
