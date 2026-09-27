import React, { useMemo, useState } from "react";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { buildPropertyRatingComparison, REVIEW_CATEGORIES } from "./reviewComparison";
import styles from "./HostReviews.module.css";

const formatRating = (rating) => (rating === null ? "-" : rating.toFixed(1));

// Review: Displays one averaged rating with a visual fill bar in the comparison table.
function RatingCell({ rating }) {
  if (rating === null) return <span className={styles.noRating}>-</span>;

  return (
    <span className={styles.ratingCell} aria-label={`${formatRating(rating)} out of 5`}>
      <span>{formatRating(rating)}</span>
      <span className={styles.ratingTrack} aria-hidden="true">
        <span className={styles.ratingFill} style={{ width: `${(rating / 5) * 100}%` }} />
      </span>
    </span>
  );
}

export default function HostReviewComparison({ reviews, properties, isLoading, errorMessage, onRefresh }) {
  const [sortBy, setSortBy] = useState("overall");
  const rows = useMemo(() => {
    // Review: Builds one comparable rating row per property, then applies the selected sort.
    const comparison = buildPropertyRatingComparison(reviews, properties);
    return comparison.sort((a, b) => {
      if (sortBy === "name") return a.title.localeCompare(b.title);
      if (sortBy === "count") return b.reviewCount - a.reviewCount || a.title.localeCompare(b.title);
      return (b.overallRating ?? -1) - (a.overallRating ?? -1) || a.title.localeCompare(b.title);
    });
  }, [reviews, properties, sortBy]);

  let reviewContent;
  if (isLoading) {
    reviewContent = <output>Loading property ratings...</output>;
  } else if (errorMessage) {
    reviewContent = <p className={styles.reviewError} role="alert">{errorMessage}</p>;
  } else if (rows.length === 0) {
    reviewContent = <p>No properties or published guest ratings are available yet.</p>;
  } else {
    reviewContent = (
      <div className={styles.comparisonTableScroll}>
        <table className={styles.comparisonTable}>
          <thead>
            <tr>
              <th scope="col">Property</th>
              <th scope="col">Reviews</th>
              <th scope="col">Overall</th>
              {REVIEW_CATEGORIES.map(({ key, label }) => <th key={key} scope="col">{label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.propertyId}>
                <th scope="row">
                  <span className={styles.propertyName}>{row.title}</span>
                  <span className={styles.propertyId}>{row.propertyId}</span>
                </th>
                <td>{row.reviewCount}</td>
                <td><RatingCell rating={row.overallRating} /></td>
                {REVIEW_CATEGORIES.map(({ key }) => (
                  <td key={key}><RatingCell rating={row.categoryRatings[key]} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <section className={styles.comparisonSection} aria-label="Compare property ratings">
      <div className={styles.comparisonHeader}>
        <div>
          <h3>Category ratings by property</h3>
          <p>Published guest reviews only. Ratings are averages out of 5.</p>
        </div>
        <div className={styles.comparisonControls}>
          <label htmlFor="review-comparison-sort">Sort by</label>
          <select id="review-comparison-sort" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="overall">Overall rating</option>
            <option value="count">Review count</option>
            <option value="name">Property name</option>
          </select>
          <button type="button" onClick={onRefresh} disabled={isLoading} aria-label="Refresh ratings" title="Refresh ratings">
            <RefreshRoundedIcon aria-hidden="true" />
          </button>
        </div>
      </div>

      {reviewContent}
    </section>
  );
}
