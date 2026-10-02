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

  useEffect(() => {
    let active = true;

    setIsCheckingSession(true);
    setEligibilityError("");
    setIsSubmitted(false);
    setSubmitError("");
    setForm(INITIAL_FORM);
    setRatingError("");

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

    if (!form.publicReview.trim()) {
      setSubmitError("Please write a public review.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      await createReview({
        reservationId,
        rating: Number(form.rating),
        publicReview: form.publicReview.trim(),
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
          <label htmlFor="publicReview">Please justify your rating*</label>
          <textarea
            id="publicReview"
            className={styles.textarea}
            value={form.publicReview}
            onChange={updateField("publicReview")}
            placeholder="Share what future guests should know..."
            maxLength={500}
            disabled={isSubmitting}
          />
          <p>{form.publicReview.length}/500</p>
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
