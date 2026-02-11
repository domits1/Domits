import dateFormatterDD_MM_YYYY from "../../../utils/DateFormatterDD_MM_YYYY";
import { placeholderImage, normalizeImageUrl } from "./image";

export {
  API_FETCH_BOOKINGS,
  API_LISTING_DETAILS_BASE,
  buildListingDetailsUrl,
} from "../services/bookingAPI";

export { placeholderImage, normalizeImageUrl };

const E164_PHONE_REGEX = /^\+[1-9]\d{7,14}$/;
const FAMILY_PATTERN = /(\d+)\s*adult[s]?\s*-\s*(\d+)\s*kid[s]?/i;

const ARRIVAL_KEYS = ["arrivaldate", "arrival_date", "arrivalDate"];
const DEPARTURE_KEYS = ["departuredate", "departure_date", "departureDate"];

const pickFirst = (obj, keys) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (value != null && value !== "") return value;
  }
  return null;
};

const startOfDay = (date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

export const isValidPhoneE164 = (phoneNumber = "") => E164_PHONE_REGEX.test(phoneNumber);

export const clamp = (value, min = 0, max = 20) => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

export const limitBetween = clamp;

export const parseFamilyString = (familyString = "") => {
  const text = String(familyString);
  const match = text.match(FAMILY_PATTERN);

  if (!match) return { adults: 0, kids: 0 };

  const adults = Number(match[1]);
  const kids = Number(match[2]);

  return { adults, kids };
};

export const formatFamilyLabel = ({ adults = 0, kids = 0 }) =>
  `${adults} adult${adults === 1 ? "" : "s"} - ${kids} kid${kids === 1 ? "" : "s"}`;

export const toDate = (rawValue) => {
  if (rawValue == null) return null;

  const numericValue = Number(rawValue);

  if (Number.isFinite(numericValue)) {
    const isSeconds = String(Math.trunc(numericValue)).length <= 10;
    const ms = isSeconds ? numericValue * 1000 : numericValue;

    const date = new Date(ms);
    return isNaN(date) ? null : date;
  }

  const date = new Date(rawValue);
  return isNaN(date) ? null : date;
};

export const getArrivalDate = (booking) => toDate(pickFirst(booking, ARRIVAL_KEYS));
export const getDepartureDate = (booking) => toDate(pickFirst(booking, DEPARTURE_KEYS));

export const splitBookingsByTime = (bookings) => {
  const today = startOfDay(new Date());

  const weekAhead = new Date(today);
  weekAhead.setDate(today.getDate() + 7);

  const currentBookings = [];
  const upcomingBookings = [];
  const pastBookings = [];

  bookings.forEach((booking) => {
    const arrivalDate = getArrivalDate(booking);
    const departureDate = getDepartureDate(booking);

    if (!arrivalDate || !departureDate) {
      upcomingBookings.push(booking);
      return;
    }

    const arrival = startOfDay(arrivalDate);
    const departure = startOfDay(departureDate);

    if (departure < today) {
      pastBookings.push(booking);
      return;
    }

    const isOngoing = arrival <= today && departure >= today;
    const startsThisWeek = arrival > today && arrival <= weekAhead;

    if (isOngoing || startsThisWeek) currentBookings.push(booking);
    else upcomingBookings.push(booking);
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

export const formatDate = (dateValue) => {
  if (!dateValue) return "-";
  return dateFormatterDD_MM_YYYY(dateValue);
};
