import React from "react";
import PropTypes from "prop-types";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import StarHalfRoundedIcon from "@mui/icons-material/StarHalfRounded";
import StarBorderRoundedIcon from "@mui/icons-material/StarBorderRounded";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PeopleIcon from "@mui/icons-material/People";
import SkeletonBlock from "./SkeletonBlock";

// Review categories shown publicly when scores are available.
const CATEGORY_LABELS = [
  { key: "cleanliness", label: "Cleanliness" },
  { key: "communication", label: "Communication" },
  { key: "location", label: "Location" },
  { key: "value", label: "Value" },
  { key: "amenities", label: "Amenities" },
  { key: "accuracy", label: "Accuracy" },
  { key: "checkIn", label: "Check-in" },
];

// Review sort options shown in the public controls.
const SORT_OPTIONS = [
  { value: "recent", label: "Most recent" },
  { value: "highest", label: "Highest rated" },
  { value: "lowest", label: "Lowest rated" },
];

// Small formatting helpers for resilient display data.
const toNumberOrNull = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const formatScore = (value) => {
  const number = toNumberOrNull(value);
  return number == null ? "" : number.toFixed(1);
};

const formatReviewDate = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatResponseAuthorRole = (role) => {
  const normalizedRole = String(role || "").trim().toLowerCase();

  if (normalizedRole.includes("property")) {
    return "Response from property manager";
  }

  return "Response from host";
};

const isVerifiedReview = (review) =>
  review?.verified === true ||
  review?.verifiedStay === true ||
  String(review?.verificationStatus || "").toUpperCase() === "VERIFIED_STAY";

const getReviewerName = (review) =>
  review?.reviewer?.name ||
  review?.guest?.name ||
  review?.authorName ||
  review?.name ||
  "Guest";

const getReviewText = (review) =>
  review?.publicReview ||
  review?.text ||
  review?.comment ||
  review?.body ||
  "";

const getReviewDate = (review) =>
  review?.publishedAt ||
  review?.reviewDate ||
  review?.createdAt ||
  review?.date ||
  "";

const getReviewRating = (review) =>
  toNumberOrNull(review?.overallRating ?? review?.rating ?? review?.score) || 0;

// Star display with half-star support for average and individual ratings.
const StarRating = ({ value = 0 }) => {
  const safeValue = Math.max(0, Math.min(5, Number(value) || 0));

  return (
    <span className="reviews-section__star-row" aria-label={`${safeValue.toFixed(1)} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => {
        const starNumber = index + 1;

        if (safeValue >= starNumber - 0.25) {
          return <StarRoundedIcon key={starNumber} fontSize="inherit" className="reviews-section__star--filled" />;
        }

        if (safeValue >= starNumber - 0.75) {
          return <StarHalfRoundedIcon key={starNumber} fontSize="inherit" className="reviews-section__star--filled" />;
        }

        return <StarBorderRoundedIcon key={starNumber} fontSize="inherit" className="reviews-section__star--empty" />;
      })}
    </span>
  );
};

// Loading placeholder for the full reviews block.
const ReviewsLoadingState = () => (
  <div className="reviews-section" aria-busy="true">
    <div className="reviews-section__header">
      <SkeletonBlock width={34} height={34} borderRadius="50%" />
      <SkeletonBlock width={180} height={22} />
      <SkeletonBlock width={120} height={18} />
    </div>

    <div className="reviews-section__categories">
      {Array.from({ length: 5 }, (_, index) => (
        <SkeletonBlock key={index} width={130} height={34} borderRadius={18} />
      ))}
    </div>

    <div className="reviews-section__grid">
      {Array.from({ length: 2 }, (_, index) => (
        <div key={index} className="reviews-section__card">
          <SkeletonBlock width={44} height={44} borderRadius="50%" />
          <SkeletonBlock width="70%" height={16} />
          <SkeletonBlock width="100%" height={14} />
          <SkeletonBlock width="82%" height={14} />
        </div>
      ))}
    </div>
  </div>
);

// One public review card with verified stay badge only when applicable.
const ReviewCard = ({ review }) => {
  const reviewerName = getReviewerName(review);
  const reviewDate = formatReviewDate(getReviewDate(review));
  const rating = getReviewRating(review);
  const text = getReviewText(review);
  const verified = isVerifiedReview(review);
  const responseDate = formatReviewDate(review?.response?.publishedAt);

  return (
    <article className="reviews-section__card">
      <div className="reviews-section__card-header">
        {review?.avatar || review?.reviewer?.avatar ? (
          <img
            className="reviews-section__card-avatar"
            src={review.avatar || review.reviewer.avatar}
            alt={`${reviewerName} avatar`}
          />
        ) : (
          <div className="reviews-section__card-avatar reviews-section__card-avatar--placeholder">
            {reviewerName.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="reviews-section__card-meta">
          <span className="reviews-section__card-name">{reviewerName}</span>
          {reviewDate && <span className="reviews-section__card-location">{reviewDate}</span>}
        </div>
      </div>

      <div className="reviews-section__card-sub">
        <StarRating value={rating} />
        <span className="reviews-section__card-score">{formatScore(rating)}</span>

        {verified && (
          <span className="reviews-section__card-verified">
            <CheckCircleIcon fontSize="inherit" />
            Verified stay
          </span>
        )}
      </div>

      <p className="reviews-section__card-text">{text || "No written review provided."}</p>

      {review?.response?.message && (
        <div className="reviews-section__host-response">
          <div className="reviews-section__host-response-header">
            <strong>{formatResponseAuthorRole(review.response.authorRole)}</strong>
            {responseDate && <span>{responseDate}</span>}
          </div>
          <p>{review.response.message}</p>
        </div>
      )}
    </article>
  );
};

// Public review summary, category scores, and review list.
const ReviewsSection = ({
  reviews = [],
  overallRating = null,
  totalReviews = 0,
  verifiedReviewCount = 0,
  categoryScores = {},
  isLoading = false,
  error = "",
  sortValue = "recent",
  verifiedOnly = false,
  categoryFilter = "",
  onSortChange = () => {},
  onVerifiedOnlyChange = () => {},
  onCategoryFilterChange = () => {},
  onClearFilters = () => {},
}) => {
  if (isLoading) {
    return <ReviewsLoadingState />;
  }

  // Category summary pills only show categories with average scores.
  const visibleCategories = CATEGORY_LABELS.filter(({ key }) => categoryScores?.[key] != null);
  // Category filter options come from summary scores, review rows, or the active filter.
  const filterableCategoryKeys = new Set(
    CATEGORY_LABELS.filter(
      ({ key }) =>
        categoryScores?.[key] != null ||
        reviews.some((review) => review?.categoryRatings?.[key] != null || review?.categoryScores?.[key] != null)
    ).map(({ key }) => key)
  );

  if (categoryFilter) {
    filterableCategoryKeys.add(categoryFilter);
  }

  const filterableCategories = CATEGORY_LABELS.filter(({ key }) => filterableCategoryKeys.has(key));
  const hasReviews = reviews.length > 0;
  const formattedAverage = formatScore(overallRating);
  const safeTotalReviews = Number(totalReviews) || reviews.length;
  const safeVerifiedCount = Number(verifiedReviewCount) || 0;
  const hasActiveFilters = sortValue !== "recent" || verifiedOnly || Boolean(categoryFilter);
  const shouldShowControls =
    !error && (safeTotalReviews > 0 || hasReviews || hasActiveFilters || filterableCategories.length > 0);

  return (
    <div className="reviews-section">
      <div className="reviews-section__header">
        <PeopleIcon className="reviews-section__header-icon" />

        <div className="reviews-section__heading-copy">
          <h3 className="reviews-section__title">Guest reviews</h3>

          {safeVerifiedCount > 0 && (
            <span className="reviews-section__verified-summary">
              <CheckCircleIcon fontSize="inherit" />
              {safeVerifiedCount} verified
            </span>
          )}
        </div>

        {formattedAverage && (
          <span className="reviews-section__overall">
            <StarRating value={Number(overallRating)} />
            <span>{formattedAverage}</span>
            <span className="reviews-section__total">
              {safeTotalReviews} {safeTotalReviews === 1 ? "review" : "reviews"}
            </span>
          </span>
        )}
      </div>

      {error && <p className="reviews-section__error">{error}</p>}

      {!error && shouldShowControls && (
        <div className="reviews-section__controls" aria-label="Review sorting and filters">
          {/* Review sorting control connected to the API sort query parameter. */}
          <label className="reviews-section__control">
            <span className="reviews-section__control-label">Sort</span>
            <select
              className="reviews-section__select"
              aria-label="Sort reviews"
              value={sortValue}
              onChange={(event) => onSortChange(event.target.value)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {/* Verified stay filter connected to the API verified query parameter. */}
          <label className="reviews-section__toggle">
            <input
              className="reviews-section__checkbox"
              type="checkbox"
              aria-label="Verified stays only"
              checked={verifiedOnly}
              onChange={(event) => onVerifiedOnlyChange(event.target.checked)}
            />
            <span>Verified stays only</span>
          </label>

          {/* Category filter appears only when category review data exists. */}
          {filterableCategories.length > 0 && (
            <label className="reviews-section__control">
              <span className="reviews-section__control-label">Category</span>
              <select
                className="reviews-section__select"
                aria-label="Filter by category"
                value={categoryFilter}
                onChange={(event) => onCategoryFilterChange(event.target.value)}
              >
                <option value="">All categories</option>
                {filterableCategories.map(({ key, label }) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {/* Reset action clears sort and filters together. */}
          {hasActiveFilters && (
            <button className="reviews-section__clear" type="button" onClick={onClearFilters}>
              Clear filters
            </button>
          )}
        </div>
      )}

      {!error && visibleCategories.length > 0 && (
        <div className="reviews-section__categories">
          {visibleCategories.map(({ key, label }) => (
            <div key={key} className="reviews-section__category-pill">
              <span className="reviews-section__category-label">{label}</span>
              <span className="reviews-section__category-score">{formatScore(categoryScores[key])}</span>
            </div>
          ))}
        </div>
      )}

      {!error && hasReviews && (
        <div className="reviews-section__grid">
          {reviews.map((review, index) => (
            <ReviewCard key={review.id || review.reviewId || index} review={review} />
          ))}
        </div>
      )}

      {!error && !hasReviews && (
        <p className="reviews-section__empty">
          {hasActiveFilters ? "No reviews match the selected filters." : "No public reviews yet."}
        </p>
      )}
    </div>
  );
};

StarRating.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

ReviewCard.propTypes = {
  review: PropTypes.object,
};

ReviewsSection.propTypes = {
  reviews: PropTypes.array,
  overallRating: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  totalReviews: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  verifiedReviewCount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  categoryScores: PropTypes.object,
  isLoading: PropTypes.bool,
  error: PropTypes.string,
  sortValue: PropTypes.oneOf(["recent", "highest", "lowest"]),
  verifiedOnly: PropTypes.bool,
  categoryFilter: PropTypes.string,
  onSortChange: PropTypes.func,
  onVerifiedOnlyChange: PropTypes.func,
  onCategoryFilterChange: PropTypes.func,
  onClearFilters: PropTypes.func,
};

export default ReviewsSection; 
