import React from "react";
import { MapPin, X } from "lucide-react";
import RatingStars from "./RatingStars";
import { normalizeImageUrl } from "../../../utils/accommodationImage";
import {
  formatPropertyLocation,
  formatSubmittedAt,
  getGuestInitials,
  getVerificationLabel,
  getReviewStatusLabel,
  isVerifiedStatus,
} from "../utils/reviewApprovalFormat";
import styles from "../styles/ReviewApproval.module.css";

export default function ReviewApprovalDetails({ review, approving, onApprove, onClose, onFlag, onPublish }) {
  const pending = review.status === "PENDING_APPROVAL";
  const canFlag = ["PENDING_APPROVAL", "APPROVED", "PUBLISHED"].includes(review.status);
  const submitted = formatSubmittedAt(review.created_at);
  const location = formatPropertyLocation(review);
  const verificationClassName = isVerifiedStatus(review.verification_status) ? styles.pillVerified : styles.pillNeutral;
  const rating = Number(review.overall_rating);

  return (
    <aside className={styles.details} aria-labelledby="review-details-heading">
      <div className={styles.detailsHeader}>
        <h2 id="review-details-heading" className={styles.detailsHeading}>
          Review details
        </h2>
        <button type="button" className={styles.iconButton} aria-label="Close review details" onClick={onClose}>
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <div className={styles.detailsSummary}>
        <img
          className={styles.detailsImage}
          src={normalizeImageUrl(review.property_image_key)}
          alt={review.property_title || "Property"}
        />
        <div className={styles.truncate}>
          <p className={styles.detailsTitle}>{review.title}</p>
          <p className={styles.detailsProperty}>
            <MapPin size={16} aria-hidden="true" />
            <span>
              {review.property_title || "Unknown property"}
              {location && <span className={styles.block}>{location}</span>}
            </span>
          </p>
          <p className={styles.detailsRating}>
            <RatingStars value={rating} size={20} className={styles.stars} />
            <span>{rating.toFixed(1)}</span>
          </p>
        </div>
      </div>

      <div className={styles.detailsGuest}>
        <span className={`${styles.avatar} ${styles.avatarLarge}`} aria-hidden="true">
          {getGuestInitials(review.guest_name)}
        </span>
        <div className={styles.truncate}>
          <p className={styles.strong}>{review.guest_name || "Guest name unavailable"}</p>
          <p className={`${styles.muted} ${styles.truncate}`}>Booking #{review.booking_id}</p>
          <p className={styles.muted}>{[submitted.date, submitted.time].filter(Boolean).join(", ")}</p>
        </div>
      </div>

      <section className={styles.detailsSection}>
        <h3>Review title</h3>
        <p>{review.title}</p>
      </section>
      <section className={styles.detailsSection}>
        <h3>Public review</h3>
        <p>{review.public_review}</p>
      </section>

      <dl className={styles.facts}>
        <dt>Status</dt>
        <dd>
          <span className={`${styles.pill} ${pending ? styles.pillPending : styles.pillNeutral}`}>
            {getReviewStatusLabel(review.status)}
          </span>
        </dd>
        <dt>Verification status</dt>
        <dd>
          <span className={`${styles.pill} ${verificationClassName}`}>
            {getVerificationLabel(review.verification_status)}
          </span>
        </dd>
        <dt>Review type</dt>
        <dd>Guest review</dd>
      </dl>

      {(canFlag || pending) && (
        <div className={styles.detailsActions}>
          {canFlag && (
            <button type="button" className={styles.secondaryButton} disabled={approving} onClick={() => onFlag(review)}>
              Flag for review
            </button>
          )}
          {pending && (
            <button
              type="button"
              className={`${styles.approveButton} ${styles.approveButtonLarge}`}
              disabled={approving}
              onClick={() => onApprove(review)}>
              {approving ? "Approving…" : "Approve review"}
            </button>
          )}
        </div>
      )}
      {review.status === "APPROVED" && review.publication_status === "UNPUBLISHED" && (
        <div className={styles.detailsActions}>
          <button type="button" className={`${styles.approveButton} ${styles.approveButtonLarge}`} disabled={approving} onClick={() => onPublish(review)}>
            {approving ? "Publishing…" : "Publish review"}
          </button>
        </div>
      )}
    </aside>
  );
}
