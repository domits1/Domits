import React, { useCallback, useEffect, useMemo, useState } from "react";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import RateReviewRoundedIcon from "@mui/icons-material/RateReviewRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import { useNavigate } from "react-router-dom";
import { getGuestReviewHistory, getReviewNotificationPreference, setReviewNotificationPreference } from "./services/reviewAPI";
import { canEditReview } from "./utils/reviewRules";
import "./styles/guestReviews.scss";

const formatStatus = (status) =>
  String(status || "draft")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^\w/, (char) => char.toUpperCase());

const formatDate = (timestamp) => {
  const date = new Date(Number(timestamp));
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

// Review: Renders a five-star display for each review in the guest history list.
function RatingStars({ value }) {
  const rating = Number(value) || 0;

  return (
    <span className="guestReviewHistoryStars" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <StarRoundedIcon key={star} className={star <= rating ? "filled" : ""} aria-hidden="true" />
      ))}
    </span>
  );
}

function GuestReviews() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [emailEnabled, setEmailEnabled] = useState(null);
  const [preferenceBusy, setPreferenceBusy] = useState(false);
  const [preferenceError, setPreferenceError] = useState("");

  const loadReviews = useCallback(async () => {
    // Review: Loads the authenticated guest's own reviews for the history page.
    setLoading(true);
    setErrorMessage("");

    try {
      const data = await getGuestReviewHistory();
      setReviews(Array.isArray(data) ? data : []);
    } catch (error) {
      setErrorMessage(error.message || "Could not load your reviews.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    // Review: Loads the guest's review email preference separately from review history.
    let active = true;
    getReviewNotificationPreference()
      .then((preference) => { if (active) setEmailEnabled(preference.emailEnabled); })
      .catch((error) => { if (active) setPreferenceError(error.message || "Could not load review email settings."); });
    return () => { active = false; };
  }, []);

  const changeEmailPreference = async (enabled) => {
    // Review: Persists whether the guest wants review request reminder emails.
    setPreferenceBusy(true);
    setPreferenceError("");
    try {
      const preference = await setReviewNotificationPreference(enabled);
      setEmailEnabled(preference.emailEnabled);
    } catch (error) {
      setPreferenceError(error.message || "Could not update review email settings.");
    } finally {
      setPreferenceBusy(false);
    }
  };

  const sortedReviews = useMemo(
    // Review: Shows recently updated review drafts and submissions first.
    () => [...reviews].sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0)),
    [reviews]
  );

  const handleEditReview = (review) => {
    // Review: Sends editable review and booking context into the review form route.
    navigate(`/guestdashboard/reviews/${encodeURIComponent(review.id)}/edit`, {
      state: {
        review,
        bookingId: review.bookingId,
        propertyId: review.propertyId,
        propertyTitle: review.propertyTitle || review.title || "Your stay",
        verifiedStay: review.verificationStatus === "VERIFIED_STAY",
      },
    });
  };

  let reviewHistoryContent;

  if (loading) {
    reviewHistoryContent = <div className="guestReviewHistoryState">Loading reviews...</div>;
  } else if (errorMessage) {
    reviewHistoryContent = (
      <div className="guestReviewHistoryError" role="alert">
        <ErrorOutlineRoundedIcon aria-hidden="true" />
        <span>{errorMessage}</span>
        <button type="button" className="guestReviewHistoryRefreshButton" onClick={loadReviews}>
          <RefreshRoundedIcon aria-hidden="true" />
          Retry
        </button>
      </div>
    );
  } else if (sortedReviews.length === 0) {
    reviewHistoryContent = (
      <section className="guestReviewHistoryEmpty">
        <RateReviewRoundedIcon aria-hidden="true" />
        <h2>No reviews yet</h2>
        <p>Your submitted and draft reviews will appear here.</p>
        <button type="button" className="guestReviewPrimaryButton" onClick={() => navigate("/guestdashboard/bookings")}>
          View bookings
        </button>
      </section>
    );
  } else {
    reviewHistoryContent = (
      <section className="guestReviewHistoryList" aria-label="Your reviews">
        {sortedReviews.map((review) => (
          <article key={review.id} className="guestReviewHistoryCard">
            <div className="guestReviewHistoryCardHeader">
              <div>
                <h2>{review.title || "Untitled review"}</h2>
                <p>{formatDate(review.createdAt)}</p>
              </div>
              <span className={`guestReviewHistoryStatus status-${String(review.status || "draft").toLowerCase()}`}>
                {formatStatus(review.status)}
              </span>
            </div>

            <RatingStars value={review.overallRating} />

            <p className="guestReviewHistoryText">{review.publicReview || "No written review yet."}</p>

            {review.privateFeedback && (
              <div className="guestReviewHistoryPrivate">
                <strong>Private feedback for host</strong>
                <p>{review.privateFeedback}</p>
              </div>
            )}

            {review.categoryRatings && Object.keys(review.categoryRatings).length > 0 && (
              <div className="guestReviewHistoryCategories">
                {Object.entries(review.categoryRatings).map(([category, rating]) => (
                  <span key={category}>
                    {formatStatus(category)}: {Number(rating)}
                  </span>
                ))}
              </div>
            )}

            {canEditReview(review) && (
              <button
                type="button"
                className="guestReviewHistoryEditButton"
                onClick={() => handleEditReview(review)}
              >
                <EditRoundedIcon aria-hidden="true" />
                Edit
              </button>
            )}
          </article>
        ))}
      </section>
    );
  }

  return (
    <main className="guestReviewHistoryPage">
      <header className="guestReviewHistoryHeader">
        <div>
          <p className="guestReviewEyebrow">Guest reviews</p>
          <h1>Review history</h1>
        </div>

        <button type="button" className="guestReviewHistoryRefreshButton" onClick={loadReviews} disabled={loading}>
          <RefreshRoundedIcon aria-hidden="true" />
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      <section className="guestReviewNotificationSettings" aria-label="Review notifications">
        <label>
          <input type="checkbox" checked={emailEnabled === true} disabled={emailEnabled === null || preferenceBusy}
            onChange={(event) => changeEmailPreference(event.target.checked)} />
          <span>Review request emails</span>
        </label>
        {preferenceError && <p role="alert">{preferenceError}</p>}
      </section>

      {reviewHistoryContent}
    </main>
  );
}

export default GuestReviews;
