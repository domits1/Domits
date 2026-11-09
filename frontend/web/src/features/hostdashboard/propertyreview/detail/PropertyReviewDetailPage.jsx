import React from "react";
import { Link, useParams } from "react-router-dom";
import StateCard from "../StateCard";
import { PROPERTY_REVIEW_LIST_PATH } from "../propertyReviewPaths";
import pageStyles from "../PropertyReviewPage.module.css";
import styles from "./PropertyReviewDetail.module.css";
import ReviewActions from "./ReviewActions";
import ReviewDetailSummary from "./ReviewDetailSummary";
import { describeDetailError, textOrEmpty } from "./reviewDetailFormat";
import usePropertyReviewDetail from "./usePropertyReviewDetail";

function PropertyReviewDetailPage() {
  const { propertyId } = useParams();
  const { detail, error, loading, reloading, reload, retry } = usePropertyReviewDetail(propertyId);

  if (loading) {
    return <StateCard title="Property review" message="Loading the listing…" />;
  }

  if (error) {
    const { message, canRetry } = describeDetailError(error);
    return (
      <StateCard title="Property review" message={message}>
        {canRetry && (
          <button type="button" className={pageStyles.retryButton} onClick={retry}>
            Retry
          </button>
        )}
        <Link className={styles.backLink} to={PROPERTY_REVIEW_LIST_PATH}>
          Back to the queue
        </Link>
      </StateCard>
    );
  }

  return (
    <StateCard title={textOrEmpty(detail.property?.title)} message={textOrEmpty(detail.property?.subtitle)}>
      <ReviewDetailSummary detail={detail} />
      <ReviewActions
        propertyId={propertyId}
        status={detail.property?.status}
        updatedAt={detail.property?.updatedAt}
        reloading={reloading}
        reload={reload}
      />
    </StateCard>
  );
}

export default PropertyReviewDetailPage;
