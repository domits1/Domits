import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../../styles/sass/features/guestdashboard/guestReservationDetail.scss";
import "../../styles/sass/features/guestdashboard/mainDashboardGuest.scss";

import PropertyCard from "./components/PropertyCard";
import CheckInInstructions from "./components/CheckInInstructions";
import HouseRules from "./components/HouseRules";
import PaymentSummary from "./components/PaymentSummary";
import BookingDetails from "./components/BookingDetails";
import PulseBarsLoader from "../../components/loaders/PulseBarsLoader";
import useDashboardIdentity from "../../hooks/useDashboardIdentity";
import {
  getGuestBookingPropertyDetails,
  getGuestBookings,
} from "./services/bookingAPI";
import {
  formatFamilyLabel,
  getArrivalDate,
  getBookingCreatedAt,
  getBookingId,
  getBookingTotal,
  getDepartureDate,
  getPaidBookings,
  getPropertyId,
  getReservationNumber,
  normalizeStayStatus,
  parseFamilyString,
} from "./utils/guestDashboardUtils";
import { normalizeImageUrl, placeholderImage } from "./utils/image";
import {
  resolveAccommodationImageUrl,
  resolvePrimaryAccommodationImageUrl,
} from "../../utils/accommodationImage";
import { isValidDate, startOfDay } from "../../utils/dashboardShared";

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
    return cleanedSegment.split(/(?=[A-Z])/).join(" ").trim();
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

  return [
    getBookingId(booking),
    booking?.paymentid,
    booking?.paymentId,
    booking?.id,
    booking?.ID,
  ].some((candidate) => String(candidate || "").trim() === normalizedReservationId);
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
  const familyCounts = parseFamilyString(
    booking?.family || booking?.guestsDetails || booking?.guestDetails || ""
  );
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
  return rules.map((ruleEntry) => formatRuleLabel(ruleEntry)).filter(Boolean);
};

const buildReservationContent = ({
  isPageLoading,
  pageError,
  reservation,
  handleMessageHost,
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
    return (
      <>
        <div className="reservationHeader">
          <h1 className="reservationTitle">{reservation.property.title}</h1>
          <span className="confirmed reservationStatus">{reservation.stay.status}</span>
        </div>

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

            <CheckInInstructions
              address={reservation.property.address}
              instructions={reservation.instructions}
            />
          </div>

          <div className="reservationRight">
            <HouseRules rules={reservation.rules} cancellationPolicy={null} />

            <div className="card helpCard">
              <h3>Need help?</h3>
              <button
                type="button"
                className="primaryBtn"
                onClick={handleMessageHost}
              >
                Message host
              </button>
            </div>

            <PaymentSummary
              nightlyRate={reservation.pricing.nightlyRate}
              nights={reservation.pricing.nights}
              cleaningFee={reservation.pricing.cleaningFee}
            />

            <BookingDetails
              reservationId={reservation.stay.reservationId}
              bookedDate={reservation.stay.bookedDate}
            />
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
        normalizeImageUrl(
          booking?.propertyImage || booking?.image || booking?.property?.coverImage || null
        ) ||
        placeholderImage,
    },
    host: {
      id: property?.hostId || property?.hostID || host?.id || host?.userId || booking?.hostid || booking?.hostId || null,
      name: host?.givenName || host?.name || host?.fullName || booking?.hostname || booking?.hostName || "Host",
      image: host?.profileImage || host?.image || null,
    },
    stay: {
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
    rules: buildRuleLabels(propertyDetails),
    instructions: [],
  };
};

function ReservationDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const {
    userId: guestId,
    loading: identityLoading,
    error: identityError,
  } = useDashboardIdentity("Guest");

  const reservationRouteId = useMemo(
    () => extractReservationIdFromPath(location.pathname),
    [location.pathname]
  );

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

        const booking = getPaidBookings(bookingData).find((entry) =>
          matchesReservationRoute(entry, reservationRouteId)
        );

        if (!booking) {
          throw new Error("Reservation not found.");
        }

        const bookingId = getBookingId(booking);
        if (!bookingId) {
          throw new Error("Reservation is missing a valid booking id.");
        }

        const propertyDetails = await getGuestBookingPropertyDetails(bookingId);
        if (!isMounted) {
          return;
        }

        setReservation(buildReservationViewModel({ booking, propertyDetails }));
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

  const reservationContent = buildReservationContent({
    isPageLoading,
    pageError,
    reservation,
    handleMessageHost,
  });

  return (
    <main className="dashboardContainer">
      <div className="dashboardLeft">
        <button type="button" className="viewAll" onClick={handleBack}>
          {"<"} Back to all trips
        </button>

        {reservationContent}
      </div>
    </main>
  );
}

export default ReservationDetails;