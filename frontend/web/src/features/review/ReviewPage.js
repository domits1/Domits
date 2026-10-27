import React, { useEffect, useMemo, useState } from "react";
import { Auth } from "aws-amplify";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Pages from "../guestdashboard/Pages";
import { ArrowLeft, MessageSquare, ShieldCheck, Lightbulb, LockKeyhole, House } from "lucide-react";
import styles from "./styles/ReviewPage.module.css";
import { createReview, getEditableReview, updateReview, publishReview } from "./services/reviewAPI";
import { buildPropertySummary } from "../guestdashboard/services/propertySummaryService";
import { getGuestBookings } from "../guestdashboard/services/bookingAPI";
import {
  getArrivalDate, getDepartureDate, getPropertyId, normalizeImageUrl,
  canLeaveReview,
  getCanonicalBookingId,
  normalizeGuestBookingsResponse,
} from "../guestdashboard/utils/guestDashboardUtils";

const RATING_LABELS = {
  1: "Horrible",
  2: "Could be better",
  3: "It was okay",
  4: "Decent",
  5: "Amazing",
};

const CATEGORIES = ["Cleanliness", "Communication", "Location", "Check-in", "Comfort", "Amenities", "Value", "Accuracy"];
const categoryKey = label => label === "Check-in" ? "checkIn" : label.toLowerCase();

const INITIAL_FORM = {
  rating: "",
  title: "",
  publicReview: "",
  privateFeedback: "",
};

// Retain the existing nonblank requirement and 500-character limit.
const REVIEW_MIN_LENGTH = 1;
const REVIEW_MAX_LENGTH = 500;
// eslint-disable-next-line no-control-regex -- Deliberately reject controls while allowing tabs and line breaks.
const INVALID_TEXT_CONTROLS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

const ReviewForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  // Keep existing emailed/bookmarked reservation links working during the URL transition.
  const bookingId = searchParams.get("bookingId") ?? searchParams.get("reservationId") ?? "";
  const reviewId = searchParams.get("reviewId") || "";
  const targetId = reviewId || bookingId;
  const [editingReview, setEditingReview] = useState(null);
  const [stay, setStay] = useState(null);
  const [categoryRatings, setCategoryRatings] = useState({});
  const [hoveredCategories, setHoveredCategories] = useState({});
  const [categoryError, setCategoryError] = useState("");

  const propertyTitle = location.state?.propertyTitle || "your stay";

  const [form, setForm] = useState(INITIAL_FORM);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [pendingPublicationId, setPendingPublicationId] = useState("");
  const [checkedBookingId, setCheckedBookingId] = useState("");
  const [eligibilityError, setEligibilityError] = useState("");
  const [ratingError, setRatingError] = useState("");
  const [hoveredRating, setHoveredRating] = useState(0);
  const displayedRating = hoveredRating || Number(form.rating);
  const [reviewError, setReviewError] = useState("");

  useEffect(() => {
    let active = true;

    setIsCheckingSession(true);
    setEligibilityError("");
    setIsSubmitted(false);
    setPendingPublicationId("");
    setSubmitError("");
    setForm(INITIAL_FORM);
    setEditingReview(null);
    setStay(null);
    setCategoryRatings({});
    setHoveredCategories({});
    setCategoryError("");
    setRatingError("");
    setHoveredRating(0);
    setReviewError("");

    const checkEligibility = async () => {
      try {
        const user = await Auth.currentUserInfo().catch(() => null);
        if (!active) return;

        const guestId = user?.attributes?.sub;
        if (!guestId) {
          setEligibilityError("Please log in before leaving a review.");
          navigate("/login", { replace: true, state: { returnTo: `${location.pathname}${location.search}` } });
          return;
        }


        if (reviewId) {
          const review = await getEditableReview(reviewId);
          if (!active) return;
          setEditingReview(review);
          setForm({ title: "", rating: String(review.overall_rating), publicReview: review.public_review || "", privateFeedback: "" });
          return;
        }
        if (!bookingId) {

          setEligibilityError("Open a completed reservation first to leave a review.");
          return;
        }

        const response = await getGuestBookings(guestId);
        if (!active) return;

        const booking = normalizeGuestBookingsResponse(response).find(
          (item) =>
            String(getCanonicalBookingId(item)) === bookingId &&
            String(item.guestid ?? item.guestId) === String(guestId)
        );

        setStay(booking || null);
        if (!booking || !canLeaveReview(booking)) {
          setEligibilityError("You can only review your own completed reservations.");
          return;
        }
        const propertyId = getPropertyId(booking);
        if (propertyId) {
          // Reservation responses may only include the property ID, so resolve the listing title.
          void buildPropertySummary(propertyId).then(summary => {
            if (active) setStay(current => ({
              ...current,
              title: summary.title,
              propertyImage: summary.imageUrl || current?.propertyImage,
              city: summary.city || current?.city,
              country: summary.country || current?.country,
              hostName: summary.hostName || current?.hostName,
              propertyId,
            }));
          }).catch(() => {});
        }
      } catch (error) {
        if (active) {
          setEligibilityError(reviewId ? error.message : "Could not verify this reservation. Please try again later.");
        }
      } finally {
        if (active) {

          setCheckedBookingId(targetId);

          setIsCheckingSession(false);
        }
      }
    };

    void checkEligibility();

    return () => {
      active = false;
    };

  }, [navigate, bookingId, reviewId, targetId, location.pathname, location.search]);


  const updateField = (field) => (event) => {
    const value = event.target.value;
    if (field === "rating") {
      if (!/^[1-5]$/.test(value)) return;
      setRatingError("");
    }
    setForm((current) => ({ ...current, [field]: value }));
    if (field === "publicReview") setReviewError("");
  };

  const publishSavedReview = async (id) => {
    setIsSubmitting(true);
    setSubmitError("");
    try {
      await publishReview(id);
      setPendingPublicationId("");
      setForm(INITIAL_FORM);
      setIsSubmitted(true);
    } catch (error) {
      setSubmitError(error.message || "Could not publish your saved review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();


    if (!targetId || checkedBookingId !== targetId || eligibilityError || (reviewId && !editingReview)) {
      setSubmitError("This review is unavailable.");

      return;
    }

    if (!/^[1-5]$/.test(form.rating)) {
      setRatingError("Please select an overall experience rating from 1 to 5 stars.");
      event.currentTarget.querySelector('input[name="stars"]')?.focus();
      return;
    }

    if (!reviewId && (!form.title.trim() || form.title.trim().length > 120)) {
      setSubmitError("Please add a review title of up to 120 characters.");
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

    const missingCategory = !reviewId && CATEGORIES.find(label => ![1, 2, 3, 4, 5].includes(categoryRatings[categoryKey(label)]));
    if (missingCategory) {
      setCategoryError("Please rate every category before submitting your review.");
      event.currentTarget.querySelector(`input[name="category-${categoryKey(missingCategory)}"]`)?.focus();
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {

      if (reviewId) {
        await updateReview({ reviewId, rating: Number(form.rating), publicReview, updatedAt: editingReview.updated_at });
      } else {
        const draft = await createReview({
          bookingId,
          title: form.title.trim(),
          rating: Number(form.rating),
          publicReview,
          privateFeedback: form.privateFeedback.trim(),
          ...(Object.keys(categoryRatings).length ? { categoryRatings } : {}),
        });
        if (typeof draft?.id !== "string" || !draft.id.trim()) {
          setEligibilityError("We could not confirm your saved review. Check your review history before submitting again.");
          return;
        }
        setPendingPublicationId(draft.id);
        await publishSavedReview(draft.id);
        return;
      }

      setForm(INITIAL_FORM);
      setIsSubmitted(true);
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderRatingInput = (value) => (
    <label key={value} onMouseEnter={() => !isSubmitting && setHoveredRating(value)}>
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
      <span className={styles.icon} data-filled={value <= displayedRating} aria-hidden="true">
        {value <= displayedRating ? "★" : "☆"}
      </span>
    </label>
  );


  const stayHostName = stay?.hostName || stay?.hostname;
  const stayTitle = stay?.title || stay?.Title || stay?.property?.title || stay?.property?.name || propertyTitle;
  const propertyId = getPropertyId(stay);
  const propertyUrl = propertyId ? `/listingdetails?ID=${encodeURIComponent(propertyId)}` : "";
  const stayPicture = normalizeImageUrl(stay?.propertyImage || stay?.image);
  const stayPictureContent = stayPicture ? <img src={stayPicture} alt={stayTitle} /> : <House size={38} aria-hidden="true" />;

  const idleSubmitLabel = reviewId ? "Save changes" : "Submit review";
  const submitLabel = isSubmitting ? "Saving..." : idleSubmitLabel;

  if (isCheckingSession || checkedBookingId !== targetId) {

    return (
      <main className={`${styles.main} ${styles.publicationPage}`}>
        <h1>Loading review form...</h1>
      </main>
    );
  }


  if (eligibilityError || !targetId) {

    return (
      <main className={`${styles.main} ${styles.publicationPage}`}>
        <h1>Review unavailable</h1>
        <p role="alert">{eligibilityError}</p>
        <button type="button" onClick={() => navigate("/guestdashboard/bookings")}>
          Back to reservations
        </button>
      </main>
    );
  }

  if (pendingPublicationId) {
    return (
      <main className={`${styles.main} ${styles.publicationPage}`}>
        <section className={styles.statusCard} aria-busy={isSubmitting}>
          <span className={styles.eyebrow}>YOUR EXPERIENCE</span>
          <h1>{isSubmitting ? "Publishing your review" : "Your review is saved"}</h1>
          <p role="status">{isSubmitting ? "Sharing your experience with future guests."
            : "Publication has not completed yet. Retry to publish your saved review."}</p>
          {submitError && <p role="alert">{submitError}</p>}
          <button type="button" disabled={isSubmitting}
            onClick={() => publishSavedReview(pendingPublicationId)}>
            {isSubmitting ? "Publishing..." : "Retry publication"}
          </button>
        </section>
      </main>
    );
  }

  if (isSubmitted) {
    return (
      <main className={`${styles.main} ${styles.publicationPage}`}>
        <section className={styles.statusCard}>
          <span className={styles.eyebrow}>THANK YOU FOR SHARING</span>
          <h1>{reviewId ? "Review updated" : "Your review is published"}</h1>
          <p role="status">{reviewId ? "Your changes have been saved as a draft for review."
            : "Your experience can now help future guests choose their next stay."}</p>
          <button type="button" onClick={() => navigate("/guestdashboard/reviews")}>
            View my reviews
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className={`${styles.main} ${styles.publicationPage}`}>
      <button className={styles.backLink} type="button" onClick={() => navigate("/guestdashboard/reviews")}>
        <ArrowLeft size={16} aria-hidden="true" /> Back to review history
      </button>
      <header className={styles.pageHeader}>
        <div><span className={styles.eyebrow}>YOUR EXPERIENCES</span>
        <h1>{reviewId ? "Edit review" : "Write a review"}</h1>
        <p>Share the details of your stay and help future guests
          feel confident about their next booking.</p></div>

      </header>
      <div className={styles.formLayout}>
      <div className={styles.formColumn}>
      {!reviewId && <section className={styles.stayCard} aria-label="Your reservation">
        {propertyUrl ? <Link className={styles.stayImage} to={propertyUrl} aria-label={`View ${stayTitle}`}>{stayPictureContent}</Link> : <div className={styles.stayImage}>{stayPictureContent}</div>}
        <div className={styles.stayDetails}><h2>{propertyUrl ? <Link className={styles.propertyTitleLink} to={propertyUrl}>{stayTitle}</Link> : stayTitle}</h2>
          {(stay?.city || stay?.location?.city) && <p>{stay.city || stay.location.city}{stay.country ? `, ${stay.country}` : ""}</p>}
          <span className={styles.verified}><ShieldCheck size={14} aria-hidden="true" /> Verified stay</span>
          <p>{[getArrivalDate(stay), getDepartureDate(stay)].filter(Boolean).map(date => date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })).join(" – ")} <span> | Reservation #{bookingId}</span></p>
        </div>
        <div className={styles.stayHost}>{stayHostName && <p>Hosted by<br />{stayHostName}</p>}
        </div>
      </section>}
      <form className={styles.reviewForm} onSubmit={handleSubmit} noValidate>

        <fieldset className={styles.rating} data-rating={displayedRating} disabled={isSubmitting}>
          <legend>Overall experience <span className={styles.requiredMark} aria-hidden="true">*</span><span className={styles.srOnly}>(required)</span></legend>
          <div onMouseLeave={() => setHoveredRating(0)}>{[1, 2, 3, 4, 5].map(renderRatingInput)}</div>
          <p id="rating-description" aria-live="polite">
            {displayedRating ? `${displayedRating} out of 5 stars — ${RATING_LABELS[displayedRating]}` : "Select a rating"}
          </p>
          {ratingError && <p id="rating-error" role="alert">{ratingError}</p>}
        </fieldset>
        {!reviewId && <section className={styles.categories} aria-label="Category ratings (required)">
          <h2>Category ratings <span className={styles.requiredMark} aria-hidden="true">*</span><span className={styles.srOnly}>(required)</span></h2>
          <div className={styles.categoryGrid}>{CATEGORIES.map(label => <fieldset key={label} className={styles.category} disabled={isSubmitting}>
            <legend>{label}</legend><div onMouseLeave={() => setHoveredCategories(current => ({ ...current, [categoryKey(label)]: 0 }))}>{[1, 2, 3, 4, 5].map(value => <label key={value} onMouseEnter={() => !isSubmitting && setHoveredCategories(current => ({ ...current, [categoryKey(label)]: value }))}>
              <input type="radio" name={`category-${categoryKey(label)}`} aria-label={`${label}: ${value} stars`} required aria-describedby={categoryError ? "category-error" : undefined} checked={categoryRatings[categoryKey(label)] === value} onChange={() => { setCategoryRatings(current => ({ ...current, [categoryKey(label)]: value })); setCategoryError(""); }} />
              <span data-filled={value <= (hoveredCategories[categoryKey(label)] || categoryRatings[categoryKey(label)] || 0)} aria-hidden="true">{value <= (hoveredCategories[categoryKey(label)] || categoryRatings[categoryKey(label)] || 0) ? "★" : "☆"}</span>
            </label>)}</div>
          </fieldset>)}</div>
          {categoryError && <p id="category-error" role="alert">{categoryError}</p>}
        </section>}
        {!reviewId && <section className={styles.content}>
          <label htmlFor="title">Review title <span className={styles.requiredMark} aria-hidden="true">*</span><span className={styles.srOnly}>(required)</span></label>
          <input id="title" value={form.title} onChange={updateField("title")}
            maxLength={120} placeholder="Give your stay a short headline" disabled={isSubmitting} required />
          <p className={styles.characterCount}>{form.title.length}/120 characters</p>
        </section>}
        <section className={styles.content}>
          <label htmlFor="publicReview">Written review <span className={styles.requiredMark} aria-hidden="true">*</span><span className={styles.srOnly}>(required)</span></label>
          <p id="publicReview-help" className={styles.srOnly}>
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
            rows={2}
            aria-invalid={Boolean(reviewError)}
            aria-describedby={`publicReview-help publicReview-count${reviewError ? " publicReview-error" : ""}`}
            disabled={isSubmitting}
          />
          <p id="publicReview-count" className={styles.characterCount}>{form.publicReview.length}/{REVIEW_MAX_LENGTH} characters</p>
          {reviewError && <p id="publicReview-error" role="alert">{reviewError}</p>}
        </section>

        {!reviewId && <section className={styles.content}>
          <label htmlFor="privateFeedback">Private feedback for your host (optional)</label>
          <textarea
            id="privateFeedback"
            className={styles.textarea}
            value={form.privateFeedback}
            onChange={updateField("privateFeedback")}
            placeholder="Optional feedback for the host..."
            maxLength={500}
            disabled={isSubmitting}
          />
          <p className={styles.characterCount}>{form.privateFeedback.length}/500 characters</p>
        </section>}

        {submitError && <p role="alert">{submitError}</p>}

        <div className={styles.buttonBox}>
          <button type="button" onClick={() => navigate(-1)} disabled={isSubmitting}>
            Cancel
          </button>
          <button
            type="submit"
            className={!form.rating || (!reviewId && !form.title.trim()) || !form.publicReview.trim() ? styles.disabled : ""}
            disabled={isSubmitting}>
            {submitLabel}
          </button>
        </div>
      </form>
      </div>
      <aside className={styles.guidance} aria-label="Review writing tips">
        <span className={styles.tipIcon}><Lightbulb size={22} aria-hidden="true" /></span>
        <h2>Small details.<br />Better stays.</h2>
        <p>Your perspective helps hosts improve and fellow travellers feel at home.</p>
        <div className={styles.tip}><span className={styles.tipIcon}><MessageSquare aria-hidden="true" /></span><div><h3>Keep it personal</h3><p>Share what stood out, from a warm welcome to a favourite corner.</p></div></div>
        <div className={styles.tip}><span className={styles.tipIcon}><ShieldCheck aria-hidden="true" /></span><div><h3>Keep it helpful</h3><p>Describe your experience honestly, including what could be better.</p></div></div>
        <div className={styles.tip}><span className={styles.tipIcon}><LockKeyhole aria-hidden="true" /></span><div><h3>Keep some things private</h3><p>Use private feedback for details you only want your host to see.</p></div></div>
        <p className={styles.guidanceFooter}>Every experience has a story.</p>
      </aside>
      </div>
    </main>
  );
};

export default function ReviewPage() {
  return <div className={`main-dashboard-guest ${styles.reviewDashboard}`}>
    <div className="main-dashboard-sidebar"><Pages /></div>
    <div className="main-dashboard-content"><ReviewForm /></div>
  </div>;
}
