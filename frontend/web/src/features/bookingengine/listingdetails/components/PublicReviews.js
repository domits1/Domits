import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import ReviewsSection from "./ReviewsSection";
import { getPublicReviews } from "../../../review/services/reviewAPI";

const PublicReviews = ({ propertyId }) => {
  const [offset, setOffset] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true });
    getPublicReviews(propertyId, offset, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setState({ data, loading: false }); })
      .catch((error) => {
        if (!controller.signal.aborted) setState({ error: error.message, loading: false });
      });
    return () => controller.abort();
  }, [propertyId, offset, attempt]);
  if (state.loading) return <p role="status">Loading guest reviews…</p>;
  if (state.error) return <div role="alert">{state.error}
    <button type="button" onClick={() => setAttempt((value) => value + 1)}>Retry</button>
  </div>;
  const { data } = state;
  return <section id="listing-reviews" className="listing-section-block">
    <ReviewsSection overallRating={data.overall_score} totalReviews={data.review_count}
      reviews={data.reviews.map((review) => ({ ...review,
        timeAgo: new Date(review.date).toLocaleDateString() }))} />
    {offset > 0 && <button type="button" className="reviews-section__show-all-btn"
      onClick={() => setOffset(offset - 10)}>Previous reviews</button>}
    {data.next_offset !== null && <button type="button" className="reviews-section__show-all-btn"
      onClick={() => setOffset(data.next_offset)}>Next reviews</button>}
  </section>;
};
PublicReviews.propTypes = { propertyId: PropTypes.string.isRequired };
export default PublicReviews;
