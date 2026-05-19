import React from "react";
import PropTypes from "prop-types";
import StarIcon from "@mui/icons-material/Star";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PeopleIcon from "@mui/icons-material/People";

const CATEGORY_LABELS = [
  { key: "cleanliness", label: "Cleanliness" },
  { key: "accuracy", label: "Accuracy" },
  { key: "communication", label: "Communication" },
  { key: "location", label: "Location" },
  { key: "checkIn", label: "Check-in" },
  { key: "value", label: "Value" },
];

const StarRating = ({ value = 0 }) => {
  const stars = Math.round(value);
  return (
    <span className="reviews-section__star-row" aria-label={`${value} stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon
          key={i}
          fontSize="inherit"
          className={i < stars ? "reviews-section__star--filled" : "reviews-section__star--empty"}
        />
      ))}
    </span>
  );
};

const ReviewCard = ({ review }) => (
  <div className="reviews-section__card">
    <div className="reviews-section__card-header">
      {review.avatar ? (
        <img
          className="reviews-section__card-avatar"
          src={review.avatar}
          alt={review.name}
        />
      ) : (
        <div className="reviews-section__card-avatar reviews-section__card-avatar--placeholder">
          {(review.name || "G").charAt(0).toUpperCase()}
        </div>
      )}
      <div className="reviews-section__card-meta">
        <span className="reviews-section__card-name">{review.name || "Guest"}</span>
        <span className="reviews-section__card-location">{review.location}</span>
      </div>
    </div>
    <div className="reviews-section__card-sub">
      <StarRating value={review.rating} />
      <span className="reviews-section__card-time">{review.timeAgo}</span>
      {review.verified && (
        <span className="reviews-section__card-verified">
          <CheckCircleIcon fontSize="inherit" /> Verified stay
        </span>
      )}
    </div>
    <p className="reviews-section__card-text">{review.text}</p>
  </div>
);

const ReviewsSection = ({
  reviews = [],
  overallRating = null,
  totalReviews = 0,
  categoryScores = {},
  onShowAll,
}) => {
  const hasReviews = reviews.length > 0;
  const hasCategories = Object.keys(categoryScores).length > 0;

  return (
    <div className="reviews-section">
      <div className="reviews-section__header">
        <PeopleIcon className="reviews-section__header-icon" />
        <h3 className="reviews-section__title">Guest reviews</h3>
        {overallRating != null && (
          <span className="reviews-section__overall">
            <StarIcon fontSize="small" className="reviews-section__overall-star" />
            {Number(overallRating).toFixed(1)}
            {totalReviews > 0 && (
              <span className="reviews-section__total"> · {totalReviews} reviews</span>
            )}
          </span>
        )}
      </div>

      {hasCategories && (
        <div className="reviews-section__categories">
          {CATEGORY_LABELS.map(({ key, label }) =>
            categoryScores[key] == null ? null : (
              <div key={key} className="reviews-section__category-pill">
                <span className="reviews-section__category-label">{label}</span>
                <span className="reviews-section__category-score">
                  {Number(categoryScores[key]).toFixed(1)}
                </span>
              </div>
            )
          )}
        </div>
      )}

      {hasReviews ? (
        <>
          <div className="reviews-section__grid">
            {reviews.slice(0, 2).map((review, i) => (
              <ReviewCard key={review.id || i} review={review} />
            ))}
          </div>
          {totalReviews > 2 && onShowAll && (
            <button
              type="button"
              className="reviews-section__show-all-btn"
              onClick={onShowAll}
            >
              Show all {totalReviews} reviews &gt;
            </button>
          )}
        </>
      ) : (
        <p className="reviews-section__empty">No reviews yet.</p>
      )}
    </div>
  );
};

StarRating.propTypes = {
  value: PropTypes.number,
};

ReviewCard.propTypes = {
  review: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    avatar: PropTypes.string,
    name: PropTypes.string,
    location: PropTypes.string,
    rating: PropTypes.number,
    timeAgo: PropTypes.string,
    verified: PropTypes.bool,
    text: PropTypes.string,
  }),
};

ReviewsSection.propTypes = {
  reviews: PropTypes.array,
  overallRating: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  totalReviews: PropTypes.number,
  categoryScores: PropTypes.shape({
    cleanliness: PropTypes.number,
    accuracy: PropTypes.number,
    communication: PropTypes.number,
    location: PropTypes.number,
    checkIn: PropTypes.number,
    value: PropTypes.number,
  }),
  onShowAll: PropTypes.func,
};

export default ReviewsSection;
