import React from "react";
import RatingStars from "./RatingStars";
import { normalizeImageUrl } from "../../../utils/accommodationImage";
import { formatPropertyLocation, formatSubmittedAt, getGuestInitials, getReviewStatusLabel } from "../utils/reviewApprovalFormat";
import styles from "../styles/ReviewApproval.module.css";

function ReviewApprovalRow({ review, selected, approving, onApprove, onPublish, onView, onClose }) {
  const pending = review.status === "PENDING_APPROVAL";
  const submitted = formatSubmittedAt(review.created_at);
  const rowClassName = `${styles.reviewRow} ${selected ? styles.selectedRow : ""}`;

  return (
    <tr
      className={rowClassName}
      aria-selected={selected}
      tabIndex={0}
      onClick={(event) => {
        if (!event.target.closest("button, input, a, label")) onView(review.id);
      }}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && ["Enter", " "].includes(event.key)) {
          event.preventDefault();
          onView(review.id);
        }
      }}
    >
      <td className={styles.selection}>
        <input
          type="checkbox"
          aria-label={`Show review details for ${review.title}`}
          checked={selected}
          onChange={(event) => (event.target.checked ? onView(review.id) : onClose())}
        />
      </td>
      <td>
        <div className={styles.reviewCell}>
          <img className={styles.thumb} src={normalizeImageUrl(review.property_image_key)} alt="" loading="lazy" />
          <div className={styles.truncate}>
            <p className={styles.strong}>{review.title}</p>
            <p className={`${styles.muted} ${styles.truncate}`}>{review.public_review}</p>
          </div>
        </div>
      </td>
      <td>
        <p>{review.property_title || "Unknown property"}</p>
        <p className={styles.muted}>{formatPropertyLocation(review)}</p>
      </td>
      <td>
        <div className={styles.guestCell}>
          <span className={styles.avatar} aria-hidden="true">
            {getGuestInitials(review.guest_name)}
          </span>
          <div className={styles.truncate}>
            <p className={styles.strong}>{review.guest_name || "Guest name unavailable"}</p>
            <p className={`${styles.muted} ${styles.truncate}`}>Booking #{review.booking_id}</p>
          </div>
        </div>
      </td>
      <td>
        <RatingStars value={Number(review.overall_rating)} size={15} className={styles.stars} />
        <span className={styles.ratingValue}>{Number(review.overall_rating).toFixed(1)}</span>
      </td>
      <td>
        <p>{submitted.date}</p>
        <p className={styles.muted}>{submitted.time}</p>
      </td>
      <td>
        <span className={`${styles.pill} ${pending ? styles.pillPending : styles.pillNeutral}`}>
          {pending ? "Pending" : getReviewStatusLabel(review.status)}
        </span>
      </td>
      <td>
        <div className={styles.rowActions}>
          {pending && (
            <button type="button" className={styles.approveButton} disabled={approving} onClick={() => onApprove(review)}>
              {approving ? "Approving…" : "Approve"}
            </button>
          )}
          {review.status === "APPROVED" && review.publication_status === "UNPUBLISHED" && (
            <button type="button" className={styles.approveButton} disabled={approving} onClick={() => onPublish(review)}>
              {approving ? "Publishing…" : "Publish"}
            </button>
          )}
          <button type="button" className={styles.secondaryButton} onClick={() => onView(review.id)}>
            View
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function ReviewApprovalTable({ label, reviews, selectedId, approvingIds, onApprove, onPublish, onView, onClose }) {
  return (
    <table className={styles.table} aria-label={label}>
      <thead>
        <tr>
          <th scope="col" aria-label="Show details" className={styles.selection} />
          <th scope="col">Review</th>
          <th scope="col">Property</th>
          <th scope="col">Guest</th>
          <th scope="col">Rating</th>
          <th scope="col">Submitted</th>
          <th scope="col">Status</th>
          <th scope="col">Actions</th>
        </tr>
      </thead>
      <tbody>
        {reviews.map((review) => (
          <ReviewApprovalRow
            key={review.id}
            review={review}
            selected={review.id === selectedId}
            approving={approvingIds.has(review.id)}
            onApprove={onApprove}
            onPublish={onPublish}
            onView={onView}
            onClose={onClose}
          />
        ))}
      </tbody>
    </table>
  );
}
