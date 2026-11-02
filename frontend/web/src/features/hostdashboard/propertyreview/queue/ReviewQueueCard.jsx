import React from "react";
import { resolvePrimaryAccommodationImageUrl } from "../../../guestdashboard/utils/image";
import {
  EMPTY_VALUE,
  formatReviewLocation,
  formatReviewPrice,
  formatReviewType,
  formatReviewUpdated,
} from "./reviewQueueFormat";
import styles from "./PropertyReviewQueue.module.css";

function ReviewQueueCard({ card }) {
  const { property, propertyImages, propertyLocation, propertyPricing, propertyType, propertyTestStatus } = card;
  const isTestListing = propertyTestStatus?.isTest === true;
  const title = property?.title || EMPTY_VALUE;
  const hostId = property?.hostId || EMPTY_VALUE;

  return (
    <article className={styles.card}>
      <img
        className={styles.photo}
        src={resolvePrimaryAccommodationImageUrl(propertyImages, "thumb")}
        alt=""
        loading="lazy"
      />
      <div className={styles.body}>
        <h2 className={styles.cardTitle}>{title}</h2>
        <p className={styles.detail}>{formatReviewLocation(propertyLocation)}</p>
        <p className={styles.detail}>{formatReviewType(propertyType)}</p>
        <p className={styles.price}>{formatReviewPrice(propertyPricing)}</p>
        <p className={styles.meta}>Host {hostId}</p>
        <p className={styles.meta}>Updated {formatReviewUpdated(property?.updatedAt)}</p>
        {isTestListing && <span className={styles.badge}>Test listing</span>}
      </div>
    </article>
  );
}

export default ReviewQueueCard;
