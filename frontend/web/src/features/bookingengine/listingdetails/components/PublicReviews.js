import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import ReviewsSection from "./ReviewsSection";
import { getPublicReviews } from "../../../review/services/reviewAPI";
import styles from "../../../review/PublicReviewFilters.module.css";

const defaults = { minRating: "", maxRating: "", startDate: "", endDate: "", verified: "", sort: "recent" };
const PropertyReviews = ({ propertyId }) => {
  const [filters, setFilters] = useState(defaults);
  const [offset, setOffset] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true });
    getPublicReviews(propertyId, offset, controller.signal, filters)
      .then((data) => { if (!controller.signal.aborted) setState({ data, loading: false }); })
      .catch((error) => {
        if (!controller.signal.aborted) setState({ error: error.message, loading: false });
      });
    return () => controller.abort();
  }, [propertyId, offset, filters, attempt]);
  const change = (key, value) => {
    setState({ loading: true }); setOffset(0);
    setFilters((current) => ({ ...current, [key]: value }));
  };
  const clear = () => { setState({ loading: true }); setOffset(0); setFilters({ ...defaults }); };
  const { data } = state;
  return <section id="listing-reviews" className="listing-section-block">
    <fieldset className={styles.filters}>
      <legend>Filter guest reviews</legend>
      {["minRating", "maxRating"].map((key) => <label key={key}>
        {key === "minRating" ? "Minimum rating" : "Maximum rating"}
        <select value={filters[key]} onChange={(event) => change(key, event.target.value)}>
          <option value="">Any</option>
          {[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}
        </select>
      </label>)}
      <label>From date<input type="date" value={filters.startDate}
        onChange={(event) => change("startDate", event.target.value)} /></label>
      <label>To date<input type="date" value={filters.endDate}
        onChange={(event) => change("endDate", event.target.value)} /></label>
      <label><input type="checkbox" checked={filters.verified === "true"}
        onChange={(event) => change("verified", event.target.checked ? "true" : "")} />Verified stays only</label>
      <label>Sort reviews<select value={filters.sort} onChange={(event) => change("sort", event.target.value)}>
        <option value="recent">Most recent</option><option value="highest">Highest rating</option>
        <option value="lowest">Lowest rating</option>
      </select></label>
      <button type="button" onClick={clear}>Clear filters</button>
    </fieldset>
    {state.loading && <p role="status">Loading guest reviews…</p>}
    {state.error && <div role="alert">{state.error}
      <button type="button" onClick={() => setAttempt((value) => value + 1)}>Retry</button>
    </div>}
    {data && <>
    <p aria-live="polite">{data.review_count} matching reviews</p>
    {data.review_count === 0 ? <p>No reviews match your selected filters.</p> :
    <ReviewsSection overallRating={data.overall_score} totalReviews={data.review_count}
      reviews={data.reviews.map((review) => ({ ...review,
        timeAgo: new Date(review.date).toLocaleDateString() }))} />}
    {offset > 0 && <button type="button" className="reviews-section__show-all-btn"
      onClick={() => setOffset(offset - 10)}>Previous reviews</button>}
    {data.next_offset !== null && <button type="button" className="reviews-section__show-all-btn"
      onClick={() => setOffset(data.next_offset)}>Next reviews</button>}
    </>}
  </section>;
};
// Remount when the selected property changes so its filters and page cannot carry over.
const PublicReviews = ({ propertyId }) => <PropertyReviews key={propertyId} propertyId={propertyId} />;
PropertyReviews.propTypes = { propertyId: PropTypes.string.isRequired };
PublicReviews.propTypes = { propertyId: PropTypes.string.isRequired };
export default PublicReviews;
