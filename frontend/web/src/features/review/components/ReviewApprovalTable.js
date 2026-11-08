import React from "react";
import RatingStars from "./RatingStars";
import { normalizeImageUrl } from "../../../utils/accommodationImage";
import { formatPropertyLocation, formatSubmittedAt, getGuestInitials } from "../utils/reviewApprovalFormat";
import styles from "../styles/ReviewApproval.module.css";

function ReviewApprovalRow({ review, selected, approving, onApprove, onView }) {
  const submitted = formatSubmittedAt(review.created_at);
  const rowClassName = selected ? styles.selectedRow : undefined;

  return (
    <tr className={rowClassName} aria-selected={selected}>
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
        <span className={`${styles.pill} ${styles.pillPending}`}>Pending</span>
      </td>
      <td>
        <div className={styles.rowActions}>
          <button type="button" className={styles.approveButton} disabled={approving} onClick={() => onApprove(review)}>
            {approving ? "Approving…" : "Approve"}
          </button>
          <button type="button" className={styles.secondaryButton} onClick={() => onView(review.id)}>
            View
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function ReviewApprovalTable({ reviews, selectedId, approvingIds, onApprove, onView }) {
  return (
    <table className={styles.table} aria-label="Reviews pending approval">
      <thead>
        <tr>
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
            onView={onView}
          />
        ))}
      </tbody>
    </table>
  );
}
