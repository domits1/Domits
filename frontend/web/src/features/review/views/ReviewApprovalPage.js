import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ListFilter, Search } from "lucide-react";
import ReviewApprovalTable from "../components/ReviewApprovalTable";
import ReviewApprovalDetails from "../components/ReviewApprovalDetails";
import useReviewApprovalQueue, { QUEUE_STATE } from "../hooks/useReviewApprovalQueue";
import { matchesReviewSearch } from "../utils/reviewApprovalFormat";
import styles from "../styles/ReviewApproval.module.css";

const PAGE_SIZE = 8;
const RATING_OPTIONS = ["5", "4", "3", "2", "1"];
// undefined follows the first visible review; null means the admin closed the panel.
const FOLLOW_FIRST = undefined;
const CLOSED = null;

const matchesRating = (review, rating) => !rating || Math.floor(Number(review.overall_rating)) === Number(rating);

function StateMessage({ title, message, children }) {
  return (
    <main className={styles.page}>
      <section className={styles.stateCard}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{message}</p>
        {children}
      </section>
    </main>
  );
}

function Pagination({ page, pageCount, total, onChange }) {
  const first = (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);
  const noun = total === 1 ? "review" : "reviews";

  return (
    <div className={styles.footer}>
      <p className={styles.muted}>{`Showing ${first}–${last} of ${total} ${noun}`}</p>
      <div className={styles.pager}>
        <button
          type="button"
          className={styles.pageButton}
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}>
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <span className={`${styles.pageButton} ${styles.pageCurrent}`} aria-current="page">
          {page}
        </span>
        <button
          type="button"
          className={styles.pageButton}
          aria-label="Next page"
          disabled={page >= pageCount}
          onClick={() => onChange(page + 1)}>
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default function ReviewApprovalPage() {
  const { reviews, queueState, loadError, retry, approve, approvingIds, notice } = useReviewApprovalQueue();
  const [query, setQuery] = useState("");
  const [rating, setRating] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(FOLLOW_FIRST);

  const visibleReviews = useMemo(
    () => reviews.filter((review) => matchesReviewSearch(review, query) && matchesRating(review, rating)),
    [reviews, query, rating]
  );
  const pageCount = Math.max(1, Math.ceil(visibleReviews.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageReviews = visibleReviews.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  // A selected review that was approved or filtered out is not shown, so fall back to the first one shown.
  const isPanelClosed = selectedId === CLOSED;
  const selectedReview = isPanelClosed
    ? null
    : (pageReviews.find((review) => review.id === selectedId) ?? pageReviews[0] ?? null);

  if (queueState === QUEUE_STATE.LOADING) {
    return <StateMessage title="Reviews" message="Loading reviews waiting for approval…" />;
  }
  if (queueState === QUEUE_STATE.DENIED) {
    return (
      <StateMessage
        title="Not authorized"
        message="Review approval is limited to Domits staff with an active review approver role."
      />
    );
  }
  if (queueState === QUEUE_STATE.FAILED) {
    return (
      <StateMessage title="Reviews" message={loadError}>
        <button type="button" className={styles.approveButton} onClick={retry}>
          Retry
        </button>
      </StateMessage>
    );
  }

  const changeFilter = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };
  const emptyMessage = reviews.length
    ? "No pending reviews match your search."
    : "No reviews are waiting for approval.";
  const layoutClassName = selectedReview ? styles.layout : `${styles.layout} ${styles.layoutSingle}`;
  const closeDetails = () => setSelectedId(CLOSED);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Reviews</h1>
          <p className={styles.subtitle}>
            Manage guest reviews, approve eligible reviews and ensure quality content on Domits.
          </p>
        </div>
        <div className={styles.toolbar}>
          <label className={styles.search}>
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              aria-label="Search reviews"
              placeholder="Search reviews by guest name, property, or reservation..."
              value={query}
              onChange={changeFilter(setQuery)}
            />
          </label>
          <div className={styles.filter}>
            <button
              type="button"
              className={styles.secondaryButton}
              aria-expanded={filtersOpen}
              aria-controls="review-rating-filter"
              onClick={() => setFiltersOpen(!filtersOpen)}>
              <ListFilter size={17} aria-hidden="true" />
              {rating ? "Filters (1)" : "Filters"}
            </button>
            <div className={styles.filterPanel} id="review-rating-filter" hidden={!filtersOpen}>
              <label htmlFor="review-rating">Rating</label>
              <select id="review-rating" value={rating} onChange={changeFilter(setRating)}>
                <option value="">All ratings</option>
                {RATING_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {`${value} star${value === "1" ? "" : "s"}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {notice && (
        <p
          role={notice.type === "error" ? "alert" : "status"}
          className={`${styles.notice} ${notice.type === "error" ? styles.noticeError : styles.noticeSuccess}`}>
          {notice.message}
        </p>
      )}

      <div className={layoutClassName}>
        <div className={styles.listColumn}>
          <div className={styles.tabs} role="tablist" aria-label="Review status">
            <button
              type="button"
              role="tab"
              id="pending-tab"
              aria-selected="true"
              aria-controls="pending-panel"
              className={styles.tab}>
              {`Pending approval (${reviews.length})`}
            </button>
            {["Published", "Rejected", "All reviews"].map((label) => (
              <button
                type="button"
                key={label}
                role="tab"
                aria-selected="false"
                title="This review list is unavailable"
                className={styles.tab}
                disabled>
                {label}
              </button>
            ))}
          </div>
          <section id="pending-panel" role="tabpanel" aria-labelledby="pending-tab">
            {pageReviews.length ? (
              <>
                <div className={styles.tableCard}>
                  <ReviewApprovalTable
                    reviews={pageReviews}
                    selectedId={selectedReview?.id}
                    approvingIds={approvingIds}
                    onApprove={approve}
                    onView={setSelectedId}
                    onClose={closeDetails}
                  />
                </div>
                <Pagination
                  page={currentPage}
                  pageCount={pageCount}
                  total={visibleReviews.length}
                  onChange={setPage}
                />
              </>
            ) : (
              <p className={styles.emptyState}>{emptyMessage}</p>
            )}
          </section>
        </div>

        {selectedReview && (
          <ReviewApprovalDetails
            review={selectedReview}
            approving={approvingIds.has(selectedReview.id)}
            onApprove={approve}
            onClose={closeDetails}
          />
        )}
      </div>
    </main>
  );
}
