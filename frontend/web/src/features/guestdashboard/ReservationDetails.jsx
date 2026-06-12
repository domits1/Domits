import React, { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "../../styles/sass/features/guestdashboard/guestReservationDetail.scss";
import "../../styles/sass/features/guestdashboard/mainDashboardGuest.scss";

import PropertyCard from "./components/PropertyCard";
import CheckInInstructions from "./components/CheckInInstructions";
import HouseRules from "./components/HouseRules";
import CancellationPolicySection, { resolveGuestCancellationPolicy } from "./components/CancellationPolicySection";
import PaymentSummary from "./components/PaymentSummary";
import BookingDetails from "./components/BookingDetails";
import PulseBarsLoader from "../../components/loaders/PulseBarsLoader";
import useDashboardIdentity from "../../hooks/useDashboardIdentity";
import { cancelGuestBooking, getGuestBookingPropertyDetails, getGuestBookings } from "./services/bookingAPI";
import {
  formatFamilyLabel,
  getArrivalDate,
  getBookingCreatedAt,
  getBookingId,
  getBookingTotal,
  getDepartureDate,
  getPaidBookings,
  normalizeGuestBookingsResponse,
  getPropertyId,
  getReservationNumber,
  normalizeStayStatus,
  parseFamilyString,
} from "./utils/guestDashboardUtils";
import { normalizeImageUrl, placeholderImage } from "./utils/image";
import { resolveAccommodationImageUrl, resolvePrimaryAccommodationImageUrl } from "../../utils/accommodationImage";
import { getActiveCancellationPolicyId } from "../../utils/policyDisplayUtils.js";
import { isValidDate, startOfDay } from "../../utils/dashboardShared";
import { fetchPropertySummaries } from "./services/propertySummaryService";

const RESERVATION_ROUTE_PREFIX = "/guestdashboard/reservation/";
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const DISPLAY_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

const formatDisplayDate = (value) => {
  if (!isValidDate(value)) {
    return "-";
  }

  return DISPLAY_DATE_FORMATTER.format(value);
};

const formatTimeValue = (value) => {
  if (value == null || value === "") {
    return "-";
  }

  const [hours = "00", minutes = "00"] = String(value).split(":");
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const formatRuleLabel = (ruleEntry) => {
  const ruleName = String(ruleEntry?.rule || "").trim();
  if (!ruleName) {
    return "";
  }

  const segments = ruleName.split("/").map((segment) => {
    const cleanedSegment = segment.replace("Allowed", "");
    return cleanedSegment
      .split(/(?=[A-Z])/)
      .join(" ")
      .trim();
  });
  const attributes = segments.join(" and ");
  const isAllowed = Boolean(ruleEntry?.value);

  return `${attributes} ${isAllowed ? "allowed" : "not allowed"}`.trim();
};

const extractReservationIdFromPath = (pathname) => {
  if (typeof pathname !== "string" || !pathname.startsWith(RESERVATION_ROUTE_PREFIX)) {
    return "";
  }

  const remainder = pathname.slice(RESERVATION_ROUTE_PREFIX.length);
  const reservationId = remainder.split("/")[0] || "";

  try {
    return decodeURIComponent(reservationId);
  } catch {
    return reservationId;
  }
};

const matchesReservationRoute = (booking, reservationId) => {
  const normalizedReservationId = String(reservationId || "").trim();
  if (!normalizedReservationId) {
    return false;
  }

  return [getBookingId(booking), booking?.paymentid, booking?.paymentId, booking?.id, booking?.ID].some(
    (candidate) => String(candidate || "").trim() === normalizedReservationId
  );
};

const buildAddressLabel = (location, fallbackLocationLabel) => {
  const streetLine = [
    location?.street,
    [location?.houseNumber, location?.houseNumberExtension].filter(Boolean).join(""),
  ]
    .filter(Boolean)
    .join(" ");
  const cityLine = [location?.postalCode, location?.city].filter(Boolean).join(" ");

  return [streetLine, cityLine, location?.country].filter(Boolean).join(", ") || fallbackLocationLabel;
};

const resolveGuestDetailsLabel = ({ guestName, familyGuestCount, familyCounts }) => {
  if (guestName) {
    return guestName;
  }

  if (familyGuestCount > 0) {
    return formatFamilyLabel(familyCounts);
  }

  return "Guest details unavailable";
};

const resolveGuestCount = ({ numericGuestCount, familyGuestCount, guestName }) => {
  if (Number.isFinite(numericGuestCount) && numericGuestCount > 0) {
    return numericGuestCount;
  }

  if (familyGuestCount > 0) {
    return familyGuestCount;
  }

  if (guestName) {
    return 1;
  }

  return 0;
};

const buildGuestDetails = (booking) => {
  const guestName = String(booking?.guestname || booking?.guestName || "").trim();
  const familyCounts = parseFamilyString(booking?.family || booking?.guestsDetails || booking?.guestDetails || "");
  const familyGuestCount = familyCounts.adults + familyCounts.kids;
  const numericGuestCount = Number(booking?.guests);
  const guests = resolveGuestCount({
    numericGuestCount,
    familyGuestCount,
    guestName,
  });

  return {
    guests,
    guestsDetails: resolveGuestDetailsLabel({
      guestName,
      familyGuestCount,
      familyCounts,
    }),
  };
};

const resolveNightlyRate = ({ roomRateRaw, total, nights, cleaningFee }) => {
  if (Number.isFinite(roomRateRaw)) {
    return roomRateRaw;
  }

  if (total != null && nights > 0) {
    return Math.max(0, total - cleaningFee) / nights;
  }

  return 0;
};

const resolveFallbackLocationLabel = ({ location, booking }) => {
  const locationLabel = [location?.city, location?.country].filter(Boolean).join(", ");
  if (locationLabel) {
    return locationLabel;
  }

  if (booking?.city) {
    return booking.city;
  }

  if (booking?.location?.city) {
    return booking.location.city;
  }

  return "Unknown location";
};

const isFallbackTitle = (title, propertyId) => {
  if (!title) return true;
  const t = String(title).trim();
  if (/^Property #/i.test(t)) return true;
  if (propertyId && t === String(propertyId)) return true;
  return false;
};

const resolveCleaningFee = (pricing) => {
  const cleaningFeeRaw = Number(pricing?.cleaning);
  if (Number.isFinite(cleaningFeeRaw)) {
    return cleaningFeeRaw;
  }

  return 0;
};

const resolveStayNights = ({ arrivalDate, departureDate }) => {
  if (!isValidDate(arrivalDate) || !isValidDate(departureDate)) {
    return 0;
  }

  return Math.max(0, Math.round((startOfDay(departureDate) - startOfDay(arrivalDate)) / DAY_IN_MS));
};

const buildRuleLabels = (propertyDetails) => {
  const rules = Array.isArray(propertyDetails?.rules) ? propertyDetails.rules : [];
  return rules
    .filter((ruleEntry) => !String(ruleEntry?.rule || "").startsWith("CancellationPolicy:"))
    .map((ruleEntry) => formatRuleLabel(ruleEntry))
    .filter(Boolean);
};

const resolveReservationCancellationPolicy = ({ booking, propertyDetails }) => {
  const snapshotPolicy =
    booking?.cancellation_policy ||
    booking?.cancellationPolicy ||
    propertyDetails?.reservation?.cancellation_policy ||
    propertyDetails?.reservation?.cancellationPolicy ||
    "";

  if (snapshotPolicy) {
    return resolveGuestCancellationPolicy(snapshotPolicy);
  }

  const fallbackPolicyId = getActiveCancellationPolicyId(propertyDetails?.rules || []);
  return fallbackPolicyId ? resolveGuestCancellationPolicy(fallbackPolicyId) : null;
};

function CancelBookingModal({ isOpen, isSubmitting, error, onClose, onConfirm }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (isOpen && !dialog.open) {
      dialog.showModal();
    }

    if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleCancel = (event) => {
    if (isSubmitting) {
      event.preventDefault();
      return;
    }

    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="cancelBookingModal"
      aria-labelledby="cancel-booking-title"
      aria-describedby="cancel-booking-description"
      onCancel={handleCancel}>
      <h2 id="cancel-booking-title">Cancel booking?</h2>
      <p id="cancel-booking-description">
        Are you sure you want to cancel this booking? Your host will be notified and this action will update your
        reservation status.
      </p>

      {error && (
        <p className="cancelBookingModalError" role="alert">
          {error}
        </p>
      )}

      <div className="cancelBookingModalActions">
        <button type="button" className="secondaryBtn modalActionBtn" onClick={onClose} disabled={isSubmitting}>
          Keep booking
        </button>
        <button type="button" className="dangerBtn modalActionBtn" onClick={onConfirm} disabled={isSubmitting}>
          {isSubmitting ? "Cancelling..." : "Yes, cancel booking"}
        </button>
      </div>
    </dialog>
  );
}

CancelBookingModal.propTypes = {
  error: PropTypes.string,
  isOpen: PropTypes.bool.isRequired,
  isSubmitting: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

CancelBookingModal.defaultProps = {
  error: "",
};

const buildReservationContent = ({
  isPageLoading,
  pageError,
  reservation,
  handleMessageHost,
  handleOpenCancelBooking,
}) => {
  if (isPageLoading) {
    return (
      <div className="card reservationStateCard">
        <PulseBarsLoader message="Loading reservation..." />
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="card reservationStateCard" role="alert">
        <h3>Reservation unavailable</h3>
        <p>{pageError}</p>
      </div>
    );
  }

  if (reservation) {
    const isCancelledReservation = normalizeStayStatus(reservation.stay.status) === "Cancelled";

    return (
      <>
        <div className="reservationHeader">
          <h1 className="reservationTitle">{reservation.property.title}</h1>
          <span className={`reservationStatus ${isCancelledReservation ? "cancelled" : "confirmed"}`}>
            {isCancelledReservation ? "Cancelled" : reservation.stay.status}
          </span>
        </div>

        {isCancelledReservation && (
          <output className="reservationCancelledBanner">This reservation has been cancelled.</output>
        )}

        <div className="reservationPage">
          <div className="reservationLeft">
            <PropertyCard
              image={reservation.property.image}
              title={reservation.property.title}
              location={reservation.property.locationLabel}
              checkIn={reservation.stay.checkInDate}
              checkInTime={reservation.stay.checkInTime}
              checkOut={reservation.stay.checkOutDate}
              checkOutTime={reservation.stay.checkOutTime}
              guests={reservation.stay.guests}
              guestsDetails={reservation.stay.guestsDetails}
              reservationId={reservation.stay.reservationId}
            />

            <CheckInInstructions address={reservation.property.address} instructions={reservation.instructions} />
          </div>

          <div className="reservationRight">
            <CancellationPolicySection policy={reservation.cancellationPolicy} />

            <HouseRules rules={reservation.rules} />

            {normalizeStayStatus(reservation.stay.status) !== "Cancelled" && (
              <div className="card cancelBookingCard">
                <h3>Cancel reservation</h3>
                <p>Review the cancellation policy above before cancelling this booking.</p>
                <button type="button" className="dangerOutlineBtn" onClick={handleOpenCancelBooking}>
                  Cancel Booking
                </button>
              </div>
            )}

            <div className="card helpCard">
              <h3>Need help?</h3>
              <button type="button" className="primaryBtn" onClick={handleMessageHost}>
                Message host
              </button>
            </div>

            <PaymentSummary
              nightlyRate={reservation.pricing.nightlyRate}
              nights={reservation.pricing.nights}
              cleaningFee={reservation.pricing.cleaningFee}
            />

            <BookingDetails reservationId={reservation.stay.reservationId} bookedDate={reservation.stay.bookedDate} />
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="card reservationStateCard">
      <h3>Reservation unavailable</h3>
      <p>Reservation not found.</p>
    </div>
  );
};

const buildReservationViewModel = ({ booking, propertyDetails }) => {
  const propertyId = getPropertyId(booking);
  const property = propertyDetails?.property || {};
  const location = propertyDetails?.location || {};
  const images = Array.isArray(propertyDetails?.images) ? propertyDetails.images : [];
  const pricing = propertyDetails?.pricing || {};
  const host = propertyDetails?.host || propertyDetails?.hostInfo || property?.host || property?.hostInfo || null;
  const arrivalDate = getArrivalDate(booking);
  const departureDate = getDepartureDate(booking);
  const bookedDate = getBookingCreatedAt(booking);
  const fallbackLocationLabel = resolveFallbackLocationLabel({
    location,
    booking,
  });
  const guestsInfo = buildGuestDetails(booking);
  const cleaningFee = resolveCleaningFee(pricing);
  const nights = resolveStayNights({
    arrivalDate,
    departureDate,
  });
  const total = getBookingTotal(booking);
  const roomRateRaw = Number(pricing?.roomRate ?? pricing?.roomrate);
  const bookingId = getBookingId(booking);
  const nightlyRate = resolveNightlyRate({
    roomRateRaw,
    total,
    nights,
    cleaningFee,
  });

  return {
    property: {
      id: propertyId,
      title: property?.title || property?.name || booking?.title || booking?.Title || `Property #${propertyId}`,
      locationLabel: fallbackLocationLabel,
      address: buildAddressLabel(location, fallbackLocationLabel),
      image:
        resolvePrimaryAccommodationImageUrl(images, "thumb") ||
        resolveAccommodationImageUrl(booking?.images?.[0], "thumb") ||
        resolveAccommodationImageUrl(booking?.property?.images?.[0], "thumb") ||
        normalizeImageUrl(booking?.propertyImage || booking?.image || booking?.property?.coverImage) ||
        placeholderImage,
    },
    host: {
      id:
        property?.hostId || property?.hostID || host?.id || host?.userId || booking?.hostid || booking?.hostId || null,
      name: host?.givenName || host?.name || host?.fullName || booking?.hostname || booking?.hostName || "Host",
      image: host?.profileImage || host?.image || null,
    },
    stay: {
      bookingId,
      reservationId: getReservationNumber(booking),
      status: normalizeStayStatus(booking?.status),
      bookedDate: formatDisplayDate(bookedDate),
      checkInDate: formatDisplayDate(arrivalDate),
      checkOutDate: formatDisplayDate(departureDate),
      checkInTime: formatTimeValue(propertyDetails?.checkIn?.checkIn?.from),
      checkOutTime: formatTimeValue(propertyDetails?.checkIn?.checkOut?.from),
      guests: guestsInfo.guests,
      guestsDetails: guestsInfo.guestsDetails,
    },
    pricing: {
      nightlyRate,
      nights,
      cleaningFee,
    },
    cancellationPolicy: resolveReservationCancellationPolicy({ booking, propertyDetails }),
    rules: buildRuleLabels(propertyDetails),
    instructions: [],
  };
};

const shouldFetchPropertySummary = (booking, bookingTitle, propertyDetails) => {
  const propertyIdForSummary = getPropertyId(booking);
  if (!propertyIdForSummary) {
    return false;
  }

  const bookingHasImages =
    (Array.isArray(booking?.images) && booking.images.length > 0) ||
    (Array.isArray(booking?.property?.images) && booking.property.images.length > 0) ||
    Boolean(booking?.property_image_url) ||
    Boolean(booking?.propertyImage) ||
    Boolean(propertyDetails?.images && propertyDetails.images.length > 0);

  return isFallbackTitle(bookingTitle, propertyIdForSummary) || !booking?.city || !bookingHasImages;
};

const enrichPropertyDetailsWithSummary = (propertyDetails, summary) => {
  const enrichedDetails = propertyDetails || {};
  enrichedDetails.property = enrichedDetails.property || {};
  enrichedDetails.location = enrichedDetails.location || {};

  if (!enrichedDetails.property.title && summary.title) {
    enrichedDetails.property.title = summary.title;
    enrichedDetails.property.name = enrichedDetails.property.name || summary.title;
  }

  if (
    (!enrichedDetails.location.city || !enrichedDetails.location.country) &&
    (summary.city || summary.country)
  ) {
    enrichedDetails.location.city = enrichedDetails.location.city || summary.city || "";
    enrichedDetails.location.country = enrichedDetails.location.country || summary.country || "";
  }

  if (
    (!Array.isArray(enrichedDetails.images) || enrichedDetails.images.length === 0) &&
    summary.imageUrl
  ) {
    enrichedDetails.images = [summary.imageUrl];
  }

  if (!enrichedDetails.host && (summary.hostName || summary.hostImage || summary.hostId)) {
    enrichedDetails.host = {
      givenName: summary.hostName || "",
      profileImage: summary.hostImage || null,
      id: summary.hostId || null,
    };
  }

  return enrichedDetails;
};

const attemptPropertySummaryEnrichment = async (booking, bookingTitle, propertyDetails) => {
  try {
    const propertyIdForSummary = getPropertyId(booking);
    const needSummary = shouldFetchPropertySummary(booking, bookingTitle, propertyDetails);

    if (needSummary) {
      const summaries = await fetchPropertySummaries([propertyIdForSummary]);
      const summary = summaries?.[propertyIdForSummary];
      if (summary) {
        return enrichPropertyDetailsWithSummary(propertyDetails, summary);
      }
    }
  } catch (summaryErr) {
    console.warn("Failed to fetch property summary for guest reservation details:", summaryErr);
  }
  return propertyDetails;
};

function ReservationDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelBookingLoading, setCancelBookingLoading] = useState(false);
  const [cancelBookingError, setCancelBookingError] = useState("");
  const { userId: guestId, loading: identityLoading, error: identityError } = useDashboardIdentity("Guest");

  const reservationRouteId = useMemo(() => extractReservationIdFromPath(location.pathname), [location.pathname]);

  useEffect(() => {
    let isMounted = true;

    const loadReservation = async () => {
      if (!reservationRouteId) {
        setError("Reservation not found.");
        setReservation(null);
        return;
      }

      if (!guestId) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const bookingData = await getGuestBookings(guestId);
        if (!isMounted) {
          return;
        }

        const allBookings = normalizeGuestBookingsResponse(bookingData);
        const booking = allBookings.find((entry) => matchesReservationRoute(entry, reservationRouteId));

        if (!booking) {
          throw new Error("Reservation not found.");
        }

        const bookingId = getBookingId(booking);
        if (!bookingId) {
          throw new Error("Reservation is missing a valid booking id.");
        }

        let propertyDetails = null;
        try {
          propertyDetails = await getGuestBookingPropertyDetails(bookingId);
          if (!isMounted) {
            return;
          }
        } catch (propertyDetailsError) {
          console.warn("Falling back to booking-only reservation details:", propertyDetailsError);
        }

        const bookingTitle = booking?.title || booking?.Title || booking?.property?.title || "";

        let enrichedPropertyDetails = propertyDetails;
        enrichedPropertyDetails = await attemptPropertySummaryEnrichment(booking, bookingTitle, enrichedPropertyDetails);

        setReservation(buildReservationViewModel({ booking, propertyDetails: enrichedPropertyDetails }));
      } catch (loadError) {
        if (isMounted) {
          let nextError = "Could not load this reservation.";
          if (loadError?.message === "Reservation not found.") {
            nextError = loadError.message;
          }
          setError(nextError);
          setReservation(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadReservation();

    return () => {
      isMounted = false;
    };
  }, [guestId, reservationRouteId]);

  const isPageLoading = identityLoading || loading;
  const pageError = error || identityError;

  const handleBack = () => {
    navigate("/guestdashboard/bookings");
  };

  const handleMessageHost = () => {
    if (reservation?.host?.id) {
      navigate("/guestdashboard/messages", {
        state: {
          messageContext: {
            contactId: reservation.host.id,
            contactName: reservation.host.name,
            contactImage: reservation.host.image,
            propertyId: reservation.property.id,
            propertyTitle: reservation.property.title,
            accoImage: reservation.property.image,
          },
        },
      });
      return;
    }

    navigate("/guestdashboard/messages");
  };

  const handleOpenCancelBooking = () => {
    setCancelBookingError("");
    setIsCancelModalOpen(true);
  };

  const handleCloseCancelBooking = () => {
    if (cancelBookingLoading) {
      return;
    }

    setCancelBookingError("");
    setIsCancelModalOpen(false);
  };

  const handleConfirmCancelBooking = async () => {
    const bookingId = reservation?.stay?.bookingId;

    if (!bookingId) {
      setCancelBookingError("This reservation is missing a booking id.");
      return;
    }

    setCancelBookingLoading(true);
    setCancelBookingError("");

    try {
      const updatedBooking = await cancelGuestBooking(bookingId);
      setIsCancelModalOpen(false);

      if (updatedBooking) {
        const updatedStatus = normalizeStayStatus(updatedBooking.status);
        setReservation((prev) => {
          if (!prev) return prev;
          return { ...prev, stay: { ...prev.stay, status: updatedStatus } };
        });
      }

      toast.success("Reservation cancelled.");
    } catch (cancelError) {
      console.error("Failed to cancel booking:", cancelError);
      setCancelBookingError("Could not cancel this booking. Please try again.");
    } finally {
      setCancelBookingLoading(false);
    }
  };

  const reservationContent = buildReservationContent({
    isPageLoading,
    pageError,
    reservation,
    handleMessageHost,
    handleOpenCancelBooking,
  });

  return (
    <main className="dashboardContainer">
      <div className="dashboardLeft">
        <button type="button" className="viewAll" onClick={handleBack}>
          {"<"} Back to all trips
        </button>

        {reservationContent}
      </div>

      <CancelBookingModal
        error={cancelBookingError}
        isOpen={isCancelModalOpen}
        isSubmitting={cancelBookingLoading}
        onClose={handleCloseCancelBooking}
        onConfirm={handleConfirmCancelBooking}
      />
    </main>
  );
}

export default ReservationDetails;
