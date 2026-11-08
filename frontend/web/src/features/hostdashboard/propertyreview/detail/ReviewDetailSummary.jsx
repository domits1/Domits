import React from "react";
import { Link } from "react-router-dom";
import { getListingStatusLabel, getListingStatusTone } from "../../hostproperty/utils/listingStatus";
import { PROPERTY_REVIEW_LIST_PATH } from "../propertyReviewPaths";
import { formatReviewPrice, formatReviewUpdated } from "../queue/reviewQueueFormat";
import { formatReviewAddress, formatReviewCleaning, textOrEmpty } from "./reviewDetailFormat";
import styles from "./PropertyReviewDetail.module.css";

function Fact({ label, children }) {
  return (
    <div className={styles.fact}>
      <dt className={styles.factLabel}>{label}</dt>
      <dd className={styles.factValue}>{children}</dd>
    </div>
  );
}

function ReviewDetailSummary({ detail }) {
  const { property, location, pricing } = detail;

  return (
    <>
      <span className={`${styles.chip} ${styles[getListingStatusTone(property?.status)]}`}>
        {getListingStatusLabel(property?.status)}
      </span>
      <dl className={styles.facts}>
        <Fact label="Host">{textOrEmpty(property?.hostId)}</Fact>
        <Fact label="Updated">{formatReviewUpdated(property?.updatedAt)}</Fact>
        <Fact label="Address">{formatReviewAddress(location)}</Fact>
        <Fact label="Price">{formatReviewPrice(pricing)}</Fact>
        <Fact label="Cleaning fee">{formatReviewCleaning(pricing)}</Fact>
        <Fact label="Description">{textOrEmpty(property?.description)}</Fact>
      </dl>
      <Link className={styles.backLink} to={PROPERTY_REVIEW_LIST_PATH}>
        Back to the queue
      </Link>
    </>
  );
}

export default ReviewDetailSummary;
