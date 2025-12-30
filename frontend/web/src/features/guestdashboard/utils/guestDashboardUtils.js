import dateFormatterDD_MM_YYYY from "../../../utils/DateFormatterDD_MM_YYYY";

export const API_FETCH_BOOKINGS =
  "https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings?readType=guest";

export const API_LISTING_DETAILS_BASE =
  "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/listingDetails";

export const S3_URL = "https://accommodation.s3.eu-north-1.amazonaws.com/";

export const placeholderImage =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360'><rect width='100%' height='100%' fill='%23eee'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23999' font-family='Arial' font-size='20'>No image</text></svg>";

export const buildListingDetailsUrl = (propertyId) =>
  `${API_LISTING_DETAILS_BASE}?property=${encodeURIComponent(propertyId)}`;

export const normalizeImageUrl = (maybeKeyOrUrl) => {
  if (!maybeKeyOrUrl) return placeholderImage;

  const valueAsString = String(maybeKeyOrUrl);

  if (valueAsString.startsWith("http")) return valueAsString;

  return `${S3_URL}${valueAsString.replace(/^\/+/, "")}`;
};

export const isValidPhoneE164 = (phoneNumber) =>
  /^\+[1-9]\d{7,14}$/.test(phoneNumber || "");

export const limitBetween = (value, min = 0, max = 20) =>
  Math.min(max, Math.max(min, value));

export const parseFamilyString = (familyString = "") => {
  const match = String(familyString).match(
    /(\d+)\s*adult[s]?\s*-\s*(\d+)\s*kid[s]?/i
  );

  if (!match) {
    return { adults: 0, kids: 0 };
  }

  return {
    adults: Number(match[1] || 0),
    kids: Number(match[2] || 0),
  };
};

export const formatFamilyLabel = ({ adults = 0, kids = 0 }) =>
  `${adults} adult${adults === 1 ? "" : "s"} - ${kids} kid${
    kids === 1 ? "" : "s"
  }`;

export const toDate = (rawValue) => {
  if (rawValue == null) return null;

  const numericValue = Number(rawValue);

  if (Number.isFinite(numericValue)) {
    const milliseconds =
      String(Math.trunc(numericValue)).length <= 10
        ? numericValue * 1000
        : numericValue;

    const parsedFromNumber = new Date(milliseconds);
    return isNaN(parsedFromNumber) ? null : parsedFromNumber;
  }

  const parsedFromString = new Date(rawValue);
  return isNaN(parsedFromString) ? null : parsedFromString;
};

export const splitBookingsByTime = (bookings) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekAhead = new Date(today);
  weekAhead.setDate(today.getDate() + 7);

  const currentBookings = [];
  const upcomingBookings = [];
  const pastBookings = [];

  bookings.forEach((booking) => {
    const arrivalDate =
      toDate(
        booking?.arrivaldate ??
          booking?.arrival_date ??
          booking?.arrivalDate
      ) || null;

    const departureDate =
      toDate(
        booking?.departuredate ??
          booking?.departure_date ??
          booking?.departureDate
      ) || null;

    if (!arrivalDate || !departureDate) {
      upcomingBookings.push(booking);
      return;
    }

    const arrival = new Date(arrivalDate);
    arrival.setHours(0, 0, 0, 0);

    const departure = new Date(departureDate);
    departure.setHours(0, 0, 0, 0);

    if (departure < today) {
      pastBookings.push(booking);
      return;
    }

    const isOngoing = arrival <= today && departure >= today;
    const startsThisWeek = arrival > today && arrival <= weekAhead;

    if (isOngoing || startsThisWeek) {
      currentBookings.push(booking);
    } else if (arrival > weekAhead) {
      upcomingBookings.push(booking);
    } else {
      upcomingBookings.push(booking);
    }
  });

  return { currentBookings, upcomingBookings, pastBookings };
};

export const getPropertyId = (booking) =>
  booking?.property_id ??
  booking?.propertyId ??
  booking?.PropertyID ??
  booking?.id ??
  booking?.ID ??
  null;

export const getArrivalDate = (booking) =>
  toDate(
    booking?.arrivaldate ??
      booking?.arrival_date ??
      booking?.arrivalDate
  );

export const getDepartureDate = (booking) =>
  toDate(
    booking?.departuredate ??
      booking?.departure_date ??
      booking?.departureDate
  );

export const formatDate = (dateValue) => {
  if (!dateValue) return "-";
  return dateFormatterDD_MM_YYYY(dateValue);
};
