import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import StarBorderRoundedIcon from "@mui/icons-material/StarBorderRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import { createReview, getReviewById, updateReview } from "./services/reviewAPI";
import { getGuestBookingPropertyDetails, getGuestBookings } from "./services/bookingAPI";
import { fetchPropertySummaries } from "./services/propertySummaryService";
import useDashboardIdentity from "../../hooks/useDashboardIdentity";
import {
  getArrivalDate,
  getBookingId,
  getDepartureDate,
  getPropertyId,
  getReservationNumber,
  normalizeGuestBookingsResponse,
} from "./utils/guestDashboardUtils";
import { canEditReview } from "./utils/reviewRules";
import {
  normalizeImageUrl,
  placeholderImage,
  resolveAccommodationImageUrl,
  resolvePrimaryAccommodationImageUrl,
} from "./utils/image";
import "./styles/guestReviewForm.scss";

const REVIEW_CATEGORIES = [
  { key: "cleanliness", label: "Cleanliness" },
  { key: "accuracy", label: "Accuracy" },
  { key: "communication", label: "Communication" },
  { key: "location", label: "Location" },
  { key: "checkIn", label: "Check-in" },
  { key: "value", label: "Value" },
];

// Review: Recognizes the edit route so the form can switch between create and update mode.
const EDIT_ROUTE_PATTERN = /^\/guestdashboard\/reviews\/([^/]+)\/edit$/;

const initialCategoryRatings = REVIEW_CATEGORIES.reduce((ratings, category) => {
  ratings[category.key] = 0;
  return ratings;
}, {});

const getEditReviewId = (pathname) => {
  // Review: Recognizes the edit route and safely decodes the selected review id.
  const match = EDIT_ROUTE_PATTERN.exec(String(pathname || ""));

  if (!match) {
    return "";
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
};

const readContextValue = ({ searchParams, state, key, fallback = "" }) => {
  const value = state?.[key] ?? searchParams.get(key) ?? fallback;
  return typeof value === "string" ? value.trim() : value;
};

const readBooleanContextValue = ({ searchParams, state, key }) => {
  const value = readContextValue({ searchParams, state, key, fallback: false });
  return value === true || value === "true";
};

const buildSuccessState = ({ isEditMode, status }) => {
  // Review: Selects the confirmation copy for create, draft, and edit submissions.
  if (isEditMode) {
    return {
      status,
      title: "Review updated",
      message: "Your changes have been saved.",
    };
  }

  if (status === "DRAFT") {
    return {
      status,
      title: "Review saved as draft",
      message: "You can return to finish this review from your review history.",
    };
  }

  return {
    status,
    title: "Review submitted",
    message: "Thanks for sharing your stay. Your review is now ready for the next step.",
  };
};

const getSubmitButtonLabel = ({ isEditMode, submittingStatus }) => {
  // Review: Keeps the submit action label clear while a create or update request is running.
  if (submittingStatus === "SUBMITTED") {
    return isEditMode ? "Updating..." : "Submitting...";
  }

  return isEditMode ? "Update review" : "Submit review";
};

const buildReviewContext = ({ searchParams, state }) => ({
  // Review: Merges review context from router state and URL parameters.
  bookingId: readContextValue({ searchParams, state, key: "bookingId" }),
  reservationId: readContextValue({ searchParams, state, key: "reservationId" }),
  propertyId: readContextValue({ searchParams, state, key: "propertyId" }),
  propertyTitle: readContextValue({ searchParams, state, key: "propertyTitle", fallback: "Your stay" }),
  propertyLocation: readContextValue({ searchParams, state, key: "propertyLocation" }),
  propertyImage: readContextValue({ searchParams, state, key: "propertyImage", fallback: placeholderImage }),
  hostId: readContextValue({ searchParams, state, key: "hostId" }),
  hostName: readContextValue({ searchParams, state, key: "hostName", fallback: "Host" }),
  checkInDate: readContextValue({ searchParams, state, key: "checkInDate" }),
  checkOutDate: readContextValue({ searchParams, state, key: "checkOutDate" }),
  guests: readContextValue({ searchParams, state, key: "guests" }),
  guestsDetails: readContextValue({ searchParams, state, key: "guestsDetails" }),
  verifiedStay: readBooleanContextValue({ searchParams, state, key: "verifiedStay" }),
});

const buildContextFromReview = (context, review) => ({
  ...context,
  bookingId: context.bookingId || review?.bookingId || "",
  propertyId: context.propertyId || review?.propertyId || "",
  propertyTitle: context.propertyTitle !== "Your stay" ? context.propertyTitle : review?.propertyTitle || "Your stay",
  verifiedStay: context.verifiedStay || review?.verificationStatus === "VERIFIED_STAY",
});

const formatStayDate = (date) =>
  date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(date)
    : "";

const buildContextFromBooking = (booking, details, summary = {}) => {
  // Review: Converts booking and listing details into the reservation card shown above the form.
  const property = details?.property || {};
  const location = details?.location || {};
  const host = details?.host || details?.hostInfo || property?.host || property?.hostInfo || {};
  const propertyId = String(getPropertyId(booking));
  const imageCandidates = [
    Array.isArray(details?.images) && details.images.length > 0
      ? resolvePrimaryAccommodationImageUrl(details.images, "thumb")
      : "",
    Array.isArray(booking.images) && booking.images.length > 0
      ? resolveAccommodationImageUrl(booking.images[0], "thumb")
      : "",
    Array.isArray(booking.property?.images) && booking.property.images.length > 0
      ? resolveAccommodationImageUrl(booking.property.images[0], "thumb")
      : "",
    booking.property_image_url || booking.propertyImage || booking.image || booking.property?.coverImage
      ? normalizeImageUrl(booking.property_image_url || booking.propertyImage || booking.image || booking.property?.coverImage)
      : "",
    summary.imageUrl,
  ];

  return {
    bookingId: String(getBookingId(booking)),
    propertyId,
    reservationId: String(getReservationNumber(booking)),
    propertyTitle: property.title || property.name || summary.title || booking.title || booking.Title || `Property #${propertyId}`,
    propertyLocation: [location.city || summary.city || booking.city, location.country || summary.country || booking.country]
      .filter(Boolean)
      .join(", "),
    propertyImage: imageCandidates.find((image) => image && image !== placeholderImage) || placeholderImage,
    hostId: property.hostId || host.id || summary.hostId || booking.hostid || booking.hostId || "",
    hostName: host.givenName || host.name || host.fullName || summary.hostName || booking.hostname || "Host",
    checkInDate: formatStayDate(getArrivalDate(booking)),
    checkOutDate: formatStayDate(getDepartureDate(booking)),
    guests: booking.guests || "",
    verifiedStay: String(booking.status || "").toLowerCase() === "completed",
  };
};

const buildUpdatePayload = ({ status, currentReviewStatus, overallRating, title, publicReview, privateFeedback, categoryRatings }) => {
  // Review: Sends status only when the guest is actually changing the review workflow state.
  const payload = {
    overallRating,
    title: title.trim(),
    publicReview: publicReview.trim(),
    privateFeedback: privateFeedback.trim() || null,
    categoryRatings,
  };

  if (String(status || "").toUpperCase() !== String(currentReviewStatus || "").toUpperCase()) {
    payload.status = status;
  }

  return payload;
};

function RatingInput({ value, onChange, label, compact = false, invalid = false, disabled = false }) {
  // Review: Lets guests select an overall or category rating without typing numbers.
  return (
    <div className={compact ? "reviewStars reviewStarsCompact" : "reviewStars"} aria-label={label}>
      {[1, 2, 3, 4, 5].map((rating) => {
        const Icon = rating <= value ? StarRoundedIcon : StarBorderRoundedIcon;

        return (
          <button
            key={rating}
            type="button"
            className={`reviewStarButton ${invalid ? "reviewStarButtonInvalid" : ""}`}
            aria-label={`${rating} star${rating === 1 ? "" : "s"}`}
            disabled={disabled}
            onClick={() => onChange(rating)}
          >
            <Icon aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

function ReservationContextCard({ context }) {
  // Review: Shows the booking details that prove which completed stay is being reviewed.
  const stayDateLabel =
    context.checkInDate && context.checkOutDate
      ? `${context.checkInDate} - ${context.checkOutDate}`
      : "Completed stay";

  return (
    <section className="guestReviewContextCard" aria-label="Reservation details">
      <div className="guestReviewPropertyImage">
        <img src={context.propertyImage || placeholderImage} alt={context.propertyTitle} />
      </div>

      <div className="guestReviewContextContent">
        {context.verifiedStay && (
          <div className="guestReviewVerifiedBadge">
            <VerifiedRoundedIcon aria-hidden="true" />
            Verified stay
          </div>
        )}

        <h2>{context.propertyTitle}</h2>

        <div className="guestReviewContextGrid">
          {context.propertyLocation && (
            <div className="guestReviewContextItem">
              <HomeRoundedIcon aria-hidden="true" />
              <span>{context.propertyLocation}</span>
            </div>
          )}

          <div className="guestReviewContextItem">
            <PersonRoundedIcon aria-hidden="true" />
            <span>Hosted by {context.hostName}</span>
          </div>

          <div className="guestReviewContextItem">
            <CalendarMonthRoundedIcon aria-hidden="true" />
            <span>{stayDateLabel}</span>
          </div>

          {context.reservationId && (
            <div className="guestReviewContextItem">
              <VerifiedRoundedIcon aria-hidden="true" />
              <span>Reservation {context.reservationId}</span>
            </div>
          )}
        </div>

        {context.verifiedStay && (
          <p className="guestReviewVerifiedMessage">
            This review is linked to your completed reservation, so future guests can trust that it comes from a real
            stay.
          </p>
        )}
      </div>
    </section>
  );
}

function GuestReviewForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId: guestId, loading: identityLoading, error: identityError } = useDashboardIdentity("Guest");

  const editReviewId = useMemo(() => getEditReviewId(location.pathname), [location.pathname]);
  const isEditMode = Boolean(editReviewId);
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const baseReviewContext = useMemo(
    () => buildReviewContext({ searchParams, state: location.state || {} }),
    [searchParams, location.state]
  );
  const needsBookingLookup = !isEditMode && Boolean(baseReviewContext.bookingId) && !location.state?.propertyTitle;

  const [loadedReview, setLoadedReview] = useState(location.state?.review || null);
  const [loadedBookingContext, setLoadedBookingContext] = useState(null);
  const [loadingContext, setLoadingContext] = useState(needsBookingLookup);
  const [contextError, setContextError] = useState("");
  const [overallRating, setOverallRating] = useState(0);
  const [categoryRatings, setCategoryRatings] = useState(initialCategoryRatings);
  const [title, setTitle] = useState("");
  const [publicReview, setPublicReview] = useState("");
  const [privateFeedback, setPrivateFeedback] = useState("");
  const [domitsPrivateFeedback, setDomitsPrivateFeedback] = useState("");
  const [loadingReview, setLoadingReview] = useState(Boolean(editReviewId));
  const [submittingStatus, setSubmittingStatus] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [successState, setSuccessState] = useState(null);

  const reviewContext = useMemo(
    () => buildContextFromReview({ ...baseReviewContext, ...loadedBookingContext }, loadedReview),
    [baseReviewContext, loadedBookingContext, loadedReview]
  );
  const isEditable = (!isEditMode || canEditReview(loadedReview)) && !contextError && !loadingContext;

  useEffect(() => {
    // Review: Loads booking context when the review form is opened from a booking link.
    if (!needsBookingLookup) {
      setLoadingContext(false);
      setContextError("");
      setLoadedBookingContext(null);
      return;
    }

    if (identityLoading) {
      return;
    }

    if (!guestId || identityError) {
      setContextError("Could not identify the guest for this reservation.");
      setLoadingContext(false);
      return;
    }

    let isMounted = true;
    setLoadingContext(true);
    setContextError("");
    setLoadedBookingContext(null);

    const loadBookingContext = async () => {
      try {
        const response = await getGuestBookings(guestId);
        const booking = normalizeGuestBookingsResponse(response).find(
          (entry) => String(getBookingId(entry)) === String(baseReviewContext.bookingId)
        );

        if (!booking || !getPropertyId(booking)) {
          throw new Error("This reservation could not be found in your bookings.");
        }

        if (baseReviewContext.propertyId && String(getPropertyId(booking)) !== String(baseReviewContext.propertyId)) {
          throw new Error("This review link does not match the reservation property.");
        }

        let details = null;
        try {
          details = await getGuestBookingPropertyDetails(getBookingId(booking));
        } catch {
          // Review: Booking data is enough to keep the review available when listing details fail.
        }

        const bookingContext = buildContextFromBooking(booking, details);
        let summary = null;
        if (
          bookingContext.propertyImage === placeholderImage ||
          bookingContext.propertyTitle === `Property #${getPropertyId(booking)}` ||
          !bookingContext.propertyLocation
        ) {
          try {
            const summaries = await fetchPropertySummaries([getPropertyId(booking)]);
            summary = summaries?.[getPropertyId(booking)] || null;
          } catch {
            // Review: Keep the booking context when the public listing summary is unavailable.
          }
        }

        if (isMounted) {
          setLoadedBookingContext(buildContextFromBooking(booking, details, summary || {}));
        }
      } catch (error) {
        if (isMounted) {
          setContextError(error.message?.startsWith("This ") ? error.message : "Could not load this reservation.");
        }
      } finally {
        if (isMounted) {
          setLoadingContext(false);
        }
      }
    };

    loadBookingContext();
    return () => {
      isMounted = false;
    };
  }, [baseReviewContext.bookingId, baseReviewContext.propertyId, guestId, identityError, identityLoading, needsBookingLookup]);

  useEffect(() => {
    // Review: Hydrates the form with an existing review when editing a draft or submitted review.
    let isMounted = true;

    const hydrateEditableReview = async () => {
      if (!editReviewId) {
        return;
      }

      setLoadingReview(true);
      setSubmitError("");

      try {
        const review = location.state?.review || (await getReviewById(editReviewId));

        if (!isMounted) {
          return;
        }

        setLoadedReview(review);
        setOverallRating(Number(review?.overallRating) || 0);
        setCategoryRatings({
          ...initialCategoryRatings,
          ...review?.categoryRatings,
        });
        setTitle(review?.title || "");
        setPublicReview(review?.publicReview || "");
        setPrivateFeedback(review?.privateFeedback || "");

        if (!canEditReview(review)) {
          setSubmitError("This review can no longer be edited.");
        }
      } catch (error) {
        if (isMounted) {
          setSubmitError(error.message || "Could not load this review.");
        }
      } finally {
        if (isMounted) {
          setLoadingReview(false);
        }
      }
    };

    hydrateEditableReview();

    return () => {
      isMounted = false;
    };
  }, [editReviewId, location.state]);

  const updateCategoryRating = (categoryKey, rating) => {
    // Review: Updates one category score and clears its validation error.
    setFieldErrors((currentErrors) => ({ ...currentErrors, [categoryKey]: "" }));
    setCategoryRatings((currentRatings) => ({
      ...currentRatings,
      [categoryKey]: rating,
    }));
  };

  const validateForm = () => {
    // Review: Checks required review content, ratings, and private feedback limits before saving.
    const nextErrors = {};

    if (contextError || loadingContext) {
      nextErrors.context = contextError || "Reservation details are still loading.";
    }

    if (!isEditMode && (!reviewContext.bookingId || !reviewContext.propertyId)) {
      nextErrors.context = "Missing booking information for this review.";
    }

    if (isEditMode && !isEditable) {
      nextErrors.context = "This review can no longer be edited.";
    }

    if (overallRating < 1) {
      nextErrors.overallRating = "Please add an overall rating.";
    }

    REVIEW_CATEGORIES.forEach((category) => {
      if (categoryRatings[category.key] < 1) {
        nextErrors[category.key] = `Please rate ${category.label.toLowerCase()}.`;
      }
    });

    if (!title.trim()) {
      nextErrors.title = "Please add a short review title.";
    }

    if (!publicReview.trim()) {
      nextErrors.publicReview = "Please write your review.";
    }

    if (title.trim().length > 120) {
      nextErrors.title = "Review title must be 120 characters or less.";
    }

    if (publicReview.trim().length > 2000) {
      nextErrors.publicReview = "Written review must be 2000 characters or less.";
    }

    if (privateFeedback.trim().length > 2000) {
      nextErrors.privateFeedback = "Private feedback must be 2000 characters or less.";
    }

    if (!isEditMode && domitsPrivateFeedback.trim().length > 2000) {
      nextErrors.domitsPrivateFeedback = "Private feedback to Domits must be 2000 characters or less.";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (status) => {
    // Review: Saves a draft, submits a new review, or updates an editable existing review.
    setSubmitError("");

    if (!validateForm()) {
      return;
    }

    setSubmittingStatus(status);

    try {
      if (isEditMode) {
        const payload = buildUpdatePayload({
          status,
          currentReviewStatus: loadedReview?.status,
          overallRating,
          title,
          publicReview,
          privateFeedback,
          categoryRatings,
        });

        await updateReview(editReviewId, payload);
      } else {
        await createReview({
          bookingId: reviewContext.bookingId,
          propertyId: reviewContext.propertyId,
          reviewType: "GUEST_TO_PROPERTY",
          overallRating,
          title: title.trim(),
          publicReview: publicReview.trim(),
          privateFeedback: privateFeedback.trim() || null,
          domitsPrivateFeedback: domitsPrivateFeedback.trim() || null,
          categoryRatings,
          status,
        });
      }

      setSuccessState(buildSuccessState({ isEditMode, status }));
    } catch (error) {
      setSubmitError(error.message || "Could not save your review.");
    } finally {
      setSubmittingStatus("");
    }
  };

  if (loadingReview || loadingContext) {
    return (
      <main className="guestReviewFormPage">
        <div className="guestReviewLoadingState">{loadingContext ? "Loading reservation..." : "Loading review..."}</div>
      </main>
    );
  }

  if (contextError) {
    return (
      <main className="guestReviewFormPage">
        <div className="guestReviewErrorBanner" role="alert">
          <ErrorOutlineRoundedIcon aria-hidden="true" />
          <span>{contextError}</span>
        </div>
        <button type="button" className="guestReviewSecondaryButton" onClick={() => navigate("/guestdashboard/bookings")}>
          Back to bookings
        </button>
      </main>
    );
  }

  if (successState) {
    return (
      <main className="guestReviewFormPage">
        <section className="guestReviewSuccessState">
          <CheckCircleRoundedIcon aria-hidden="true" />
          <h1>{successState.title}</h1>
          <output className="guestReviewSuccessMessage">{successState.message}</output>

          <div className="guestReviewActions guestReviewSuccessActions">
            <button type="button" className="guestReviewSecondaryButton" onClick={() => navigate("/guestdashboard/reviews")}>
              View review history
            </button>
            <button type="button" className="guestReviewPrimaryButton" onClick={() => navigate("/guestdashboard/bookings")}>
              Back to bookings
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="guestReviewFormPage">
      <button type="button" className="guestReviewBackButton" onClick={() => navigate(-1)}>
        <ArrowBackRoundedIcon aria-hidden="true" />
        Back
      </button>

      <header className="guestReviewHeader">
        <div>
          <p className="guestReviewEyebrow">Guest review</p>
          <h1>{isEditMode ? "Edit your review" : "Review your stay"}</h1>
        </div>
      </header>

      <ReservationContextCard context={reviewContext} />

      {(fieldErrors.context || submitError) && (
        <div className="guestReviewErrorBanner" role="alert">
          <ErrorOutlineRoundedIcon aria-hidden="true" />
          <span>{fieldErrors.context || submitError}</span>
        </div>
      )}

      <form className="guestReviewForm" onSubmit={(event) => event.preventDefault()}>
        <section className="guestReviewSection">
          <h2 className="guestReviewLabel">Overall rating</h2>
          <RatingInput
            value={overallRating}
            disabled={!isEditable}
            onChange={(rating) => {
              setOverallRating(rating);
              setFieldErrors((currentErrors) => ({ ...currentErrors, overallRating: "" }));
            }}
            label="Overall rating"
            invalid={Boolean(fieldErrors.overallRating)}
          />
          {fieldErrors.overallRating && <p className="guestReviewFieldError">{fieldErrors.overallRating}</p>}
        </section>

        <section className="guestReviewSection">
          <h2 className="guestReviewLabel">Category ratings</h2>

          <div className="guestReviewCategories">
            {REVIEW_CATEGORIES.map((category) => (
              <div key={category.key} className="guestReviewCategoryRow">
                <span>{category.label}</span>
                <RatingInput
                  compact
                  value={categoryRatings[category.key]}
                  disabled={!isEditable}
                  onChange={(rating) => updateCategoryRating(category.key, rating)}
                  label={`${category.label} rating`}
                  invalid={Boolean(fieldErrors[category.key])}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="guestReviewSection">
          <label className="guestReviewLabel" htmlFor="review-title">
            Review title
          </label>
          <input
            id="review-title"
            className={`guestReviewInput ${fieldErrors.title ? "guestReviewInputInvalid" : ""}`}
            value={title}
            disabled={!isEditable}
            onChange={(event) => {
              setTitle(event.target.value);
              setFieldErrors((currentErrors) => ({ ...currentErrors, title: "" }));
            }}
            maxLength={120}
            placeholder="Summarize your stay"
          />
          <div className="guestReviewInputMeta">
            {fieldErrors.title && <p className="guestReviewFieldError">{fieldErrors.title}</p>}
            <span>{title.length}/120</span>
          </div>
        </section>

        <section className="guestReviewSection">
          <label className="guestReviewLabel" htmlFor="public-review">
            Written review
          </label>
          <textarea
            id="public-review"
            className={`guestReviewTextarea ${fieldErrors.publicReview ? "guestReviewInputInvalid" : ""}`}
            value={publicReview}
            disabled={!isEditable}
            onChange={(event) => {
              setPublicReview(event.target.value);
              setFieldErrors((currentErrors) => ({ ...currentErrors, publicReview: "" }));
            }}
            maxLength={2000}
            placeholder="Tell future guests what stood out."
          />
          <div className="guestReviewInputMeta">
            {fieldErrors.publicReview && <p className="guestReviewFieldError">{fieldErrors.publicReview}</p>}
            <span>{publicReview.length}/2000</span>
          </div>
        </section>

        <section className="guestReviewSection guestReviewPrivateSection">
          <label className="guestReviewLabel" htmlFor="private-feedback">
            Private feedback for the host
          </label>
          <textarea
            id="private-feedback"
            className={`guestReviewTextarea ${fieldErrors.privateFeedback ? "guestReviewInputInvalid" : ""}`}
            value={privateFeedback}
            disabled={!isEditable}
            onChange={(event) => {
              setPrivateFeedback(event.target.value);
              setFieldErrors((currentErrors) => ({ ...currentErrors, privateFeedback: "" }));
            }}
            maxLength={2000}
            placeholder="Share private feedback for the host."
          />
          <div className="guestReviewInputMeta">
            {fieldErrors.privateFeedback && <p className="guestReviewFieldError">{fieldErrors.privateFeedback}</p>}
            <span>{privateFeedback.length}/2000</span>
          </div>
          <p>This feedback is only shared privately with the host.</p>
        </section>

        {!isEditMode && (
          <section className="guestReviewSection guestReviewDomitsPrivateSection">
            <label className="guestReviewLabel" htmlFor="domits-private-feedback">
              Private feedback for Domits
            </label>
            <textarea
              id="domits-private-feedback"
              className={`guestReviewTextarea ${fieldErrors.domitsPrivateFeedback ? "guestReviewInputInvalid" : ""}`}
              value={domitsPrivateFeedback}
              disabled={!isEditable}
              onChange={(event) => {
                setDomitsPrivateFeedback(event.target.value);
                setFieldErrors((currentErrors) => ({ ...currentErrors, domitsPrivateFeedback: "" }));
              }}
              maxLength={2000}
              placeholder="Share issues, suggestions, or concerns privately with Domits."
            />
            <div className="guestReviewInputMeta">
              {fieldErrors.domitsPrivateFeedback && (
                <p className="guestReviewFieldError">{fieldErrors.domitsPrivateFeedback}</p>
              )}
              <span>{domitsPrivateFeedback.length}/2000</span>
            </div>
            <p>This is private for Domits internal support and will not appear publicly or be shared with the host.</p>
          </section>
        )}

        <div className="guestReviewActions">
          <button
            type="button"
            className="guestReviewSecondaryButton"
            disabled={Boolean(submittingStatus) || !isEditable}
            onClick={() => handleSubmit("DRAFT")}
          >
            <SaveRoundedIcon aria-hidden="true" />
            {submittingStatus === "DRAFT" ? "Saving..." : "Save draft"}
          </button>

          <button
            type="button"
            className="guestReviewPrimaryButton"
            disabled={Boolean(submittingStatus) || !isEditable}
            onClick={() => handleSubmit("SUBMITTED")}
          >
            <SendRoundedIcon aria-hidden="true" />
            {getSubmitButtonLabel({ isEditMode, submittingStatus })}
          </button>
        </div>
      </form>
    </main>
  );
}

export default GuestReviewForm;
