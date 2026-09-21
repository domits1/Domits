import React, { useCallback, useEffect, useMemo, useState } from "react";
import spinner from "../../images/spinnner.gif";
import styles from "./HostReviews.module.css";
import general from "./HostDashboard.module.scss";
import DateFormatterDD_MM_YYYY from "../../utils/DateFormatterDD_MM_YYYY";
import useEffectiveHostId from "../../hooks/useEffectiveHostId";
import ReviewResponseEditor from "./components/ReviewResponseEditor";
import { fetchHostReviews } from "./services/reviewResponseService";

const formatStatus = (status) =>
  String(status || "draft")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (char) => char.toUpperCase());

const getReviewDate = (review) => review?.publishedAt || review?.createdAt || review?.date || "";
const getReviewText = (review) => review?.publicReview || review?.content || "No written review provided.";
const getReviewTitle = (review) => review?.title || "Guest review";

function HostReviews() {
  const { effectiveHostId, loading: identityLoading } = useEffectiveHostId();
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadReviews = useCallback(async () => {
    if (!effectiveHostId) {
      setReviews([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const data = await fetchHostReviews(effectiveHostId);
      setReviews(Array.isArray(data) ? data : []);
    } catch (error) {
      setErrorMessage(error.message || "Could not load host reviews.");
      setReviews([]);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveHostId]);

  useEffect(() => {
    if (!identityLoading) {
      loadReviews();
    }
  }, [identityLoading, loadReviews]);

  const sortedReviews = useMemo(
    () => [...reviews].sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)),
    [reviews]
  );

  const publicReviews = sortedReviews.filter((review) => review.status === "PUBLISHED");
  const draftResponses = sortedReviews.filter((review) => review.response?.status === "draft");

  return (
    <main className="page-body">
      <h2>Reviews</h2>
      <div className={styles.reviewGrid}>
        <div className={styles.contentContainer}>
          <section className={styles.reviewColumnWide} aria-label="Host review responses">
            <div className={styles.reviewBox}>
              <div className={styles.reviewBoxHeader}>
                <div>
                  <p className={styles.boxText}>Received reviews ({sortedReviews.length})</p>
                  <p className={styles.reviewSubtext}>
                    {publicReviews.length} public, {draftResponses.length} draft responses
                  </p>
                </div>
                <button type="button" className={styles.refreshButton} onClick={loadReviews} disabled={isLoading}>
                  {isLoading ? "Refreshing..." : "Refresh"}
                </button>
              </div>

              {identityLoading || isLoading ? (
                <div className={general.loadingContainer} aria-busy="true">
                  <img className={general.spinner} src={spinner} alt="Loading reviews" />
                </div>
              ) : errorMessage ? (
                <p className={styles.reviewError} role="alert">
                  {errorMessage}
                </p>
              ) : sortedReviews.length > 0 ? (
                sortedReviews.map((review) => (
                  <article key={review.id || review.reviewId} className={styles.reviewTab}>
                    <div className={styles.reviewHeaderRow}>
                      <div>
                        <h3 className={styles.reviewHeader}>{getReviewTitle(review)}</h3>
                        <p className={styles.reviewDate}>
                          Written on: {getReviewDate(review) ? DateFormatterDD_MM_YYYY(getReviewDate(review)) : "-"}
                        </p>
                      </div>
                      <span className={styles.reviewStatus}>{formatStatus(review.status)}</span>
                    </div>

                    <p className={styles.reviewContent}>{getReviewText(review)}</p>

                    {review.privateFeedback && (
                      <div className={styles.privateFeedback}>
                        <strong>Private feedback</strong>
                        <p>{review.privateFeedback}</p>
                      </div>
                    )}

                    <ReviewResponseEditor review={review} onChanged={loadReviews} styles={styles} />
                  </article>
                ))
              ) : (
                <p className={styles.reviewAlert}>No received reviews are ready for response yet.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

export default HostReviews;
