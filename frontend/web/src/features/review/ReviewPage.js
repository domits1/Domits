import React, { useEffect, useMemo, useState } from "react";
import { Auth } from "aws-amplify";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./ReviewPage.module.css";
import { createReview } from "./services/reviewAPI";
import { getGuestBookings } from "../guestdashboard/services/bookingAPI";
import {
  canLeaveReview,
  getBookingId,
  normalizeGuestBookingsResponse,
} from "../guestdashboard/utils/guestDashboardUtils";

const RATING_LABELS = {
  1: "Horrible",
  2: "Could be better",
  3: "It was okay",
  4: "Decent",
  5: "Amazing",
};

const INITIAL_FORM = {
  rating: "",
  publicReview: "",
  privateFeedback: "",
};

// Retain the existing nonblank requirement and 500-character limit.
const REVIEW_MIN_LENGTH = 1;
const REVIEW_MAX_LENGTH = 500;
// eslint-disable-next-line no-control-regex -- Deliberately reject controls while allowing tabs and line breaks.
const INVALID_TEXT_CONTROLS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

const ReviewPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const reservationId = searchParams.get("reservationId") || "";
  const propertyTitle = location.state?.propertyTitle || "your stay";

  const [form, setForm] = useState(INITIAL_FORM);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [checkedReservationId, setCheckedReservationId] = useState("");
  const [eligibilityError, setEligibilityError] = useState("");
  const [ratingError, setRatingError] = useState("");
  const [reviewError, setReviewError] = useState("");

  useEffect(() => {
    let active = true;

    setIsCheckingSession(true);
    setEligibilityError("");
    setIsSubmitted(false);
    setSubmitError("");
    setForm(INITIAL_FORM);
    setRatingError("");
    setReviewError("");

    const checkEligibility = async () => {
      try {
        const user = await Auth.currentUserInfo().catch(() => null);
        if (!active) return;

        const guestId = user?.attributes?.sub;
        if (!guestId) {
          setEligibilityError("Please log in before leaving a review.");
          navigate("/login");
          return;
        }

        if (!reservationId) {
          setEligibilityError("Open a completed reservation first to leave a review.");
          return;
        }

        const response = await getGuestBookings(guestId);
        if (!active) return;

        const booking = normalizeGuestBookingsResponse(response).find(
          (item) =>
            String(getBookingId(item)) === reservationId &&
            String(item.guestid ?? item.guestId) === String(guestId)
        );

        if (!booking || !canLeaveReview(booking)) {
          setEligibilityError("You can only review your own completed reservations.");
        }
      } catch {
        if (active) {
          setEligibilityError("Could not verify this reservation. Please try again later.");
        }
      } finally {
        if (active) {
          setCheckedReservationId(reservationId);
          setIsCheckingSession(false);
        }
      }
    };

    void checkEligibility();

    return () => {
      active = false;
    };
  }, [navigate, reservationId]);

  const updateField = (field) => (event) => {
    const value = event.target.value;
    if (field === "rating") {
      if (!/^[1-5]$/.test(value)) return;
      setRatingError("");
    }
    setForm((current) => ({ ...current, [field]: value }));
    if (field === "publicReview") setReviewError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!reservationId || checkedReservationId !== reservationId || eligibilityError) {
      setSubmitError("This reservation is not eligible for a review.");
      return;
    }

    if (!/^[1-5]$/.test(form.rating)) {
      setRatingError("Please select an overall experience rating from 1 to 5 stars.");
      event.currentTarget.querySelector('input[name="stars"]')?.focus();
      return;
    }

    const publicReview = form.publicReview.replace(/\r\n?/g, "\n").trim();
    let validationMessage = "";
    if (publicReview.length < REVIEW_MIN_LENGTH) {
      validationMessage = "Please describe your stay before submitting your review.";
    } else if (publicReview.length > REVIEW_MAX_LENGTH) {
      validationMessage = `Your written review must be ${REVIEW_MAX_LENGTH} characters or fewer.`;
    } else if (INVALID_TEXT_CONTROLS.test(form.publicReview)) {
      validationMessage = "Please remove unsupported control characters from your review.";
    }
    if (validationMessage) {
      setReviewError(validationMessage);
      event.currentTarget.querySelector("#publicReview")?.focus();
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      await createReview({
        reservationId,
        rating: Number(form.rating),
        publicReview,
        privateFeedback: form.privateFeedback.trim(),
      });
      setForm(INITIAL_FORM);
      setIsSubmitted(true);
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderRatingInput = (value) => (
    <label key={value}>
      <input
        type="radio"
        name="stars"
        value={value}
        checked={form.rating === String(value)}
        onChange={updateField("rating")}
        disabled={isSubmitting}
        required
        aria-label={`${value} ${value === 1 ? "star" : "stars"}: ${RATING_LABELS[value]}`}
        aria-describedby={`rating-description${ratingError ? " rating-error" : ""}`}
      />
      <span className={styles.icon} aria-hidden="true">
        {value <= Number(form.rating) ? "★" : "☆"}
      </span>
    </label>
  );

  if (isCheckingSession || checkedReservationId !== reservationId) {
    return (
      <main className={styles.main}>
        <h1>Loading review form...</h1>
      </main>
    );
  }

  if (eligibilityError || !reservationId) {
    return (
      <main className={styles.main}>
        <h1>Review unavailable</h1>
        <p role="alert">{eligibilityError}</p>
        <button type="button" onClick={() => navigate("/guestdashboard/bookings")}>
          Back to reservations
        </button>
      </main>
    );
  }

  if (isSubmitted) {
    return (
      <main className={styles.main}>
        <h1>Review submitted</h1>
        <p className={styles.comment}>
          Thank you for sharing your experience. Your review was saved as a draft.
        </p>
        <button type="button" onClick={() => navigate("/guestdashboard/bookings")}>
          Back to reservations
        </button>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <h1>Review {propertyTitle}</h1>
      <form onSubmit={handleSubmit} noValidate>
        <fieldset className={styles.rating} disabled={isSubmitting}>
          <legend>Overall experience (required)</legend>
          <div>{[1, 2, 3, 4, 5].map(renderRatingInput)}</div>
          <p id="rating-description" aria-live="polite">
            {form.rating ? `${form.rating} out of 5 stars — ${RATING_LABELS[form.rating]}` : "Select a rating"}
          </p>
          {ratingError && <p id="rating-error" role="alert">{ratingError}</p>}
        </fieldset>
        <section className={styles.content}>
          <label htmlFor="publicReview">Written review (required)</label>
          <p id="publicReview-help">
            Describe your stay in your own words, including anything you liked or disliked.
            Use up to {REVIEW_MAX_LENGTH} characters.
          </p>
          <textarea
            id="publicReview"
            className={styles.textarea}
            value={form.publicReview}
            onChange={updateField("publicReview")}
            placeholder="What would you like future guests to know about your stay?"
            required
            minLength={REVIEW_MIN_LENGTH}
            maxLength={REVIEW_MAX_LENGTH}
            rows={6}
            aria-invalid={Boolean(reviewError)}
            aria-describedby={`publicReview-help publicReview-count${reviewError ? " publicReview-error" : ""}`}
            disabled={isSubmitting}
          />
          <p id="publicReview-count">{form.publicReview.length}/{REVIEW_MAX_LENGTH} characters</p>
          {reviewError && <p id="publicReview-error" role="alert">{reviewError}</p>}
        </section>

        <section className={styles.content}>
          <label htmlFor="privateFeedback">Do you have any feedback? (not required)</label>
          <textarea
            id="privateFeedback"
            className={styles.textarea}
            value={form.privateFeedback}
            onChange={updateField("privateFeedback")}
            placeholder="Optional feedback for the host..."
            maxLength={500}
            disabled={isSubmitting}
          />
          <p>{form.privateFeedback.length}/500</p>
        </section>

        {submitError && <p role="alert">{submitError}</p>}

        <div className={styles.buttonBox}>
          <button type="button" onClick={() => navigate(-1)} disabled={isSubmitting}>
            Cancel
          </button>
          <button
            type="submit"
            className={!form.rating || !form.publicReview.trim() ? styles.disabled : ""}
            disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit review"}
          </button>
        </div>
      </form>
    </main>
  );
};

export default ReviewPage;
