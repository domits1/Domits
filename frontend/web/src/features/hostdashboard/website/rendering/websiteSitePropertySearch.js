import { placeholderImage } from "../../../../utils/accommodationImage";
import { buildSitePropertyModel } from "./websiteSiteProperties";
import { isValidDateKey, quoteMatchesSelection } from "./booking/quoteSelection";

export const MAX_SITE_PROPERTY_SEARCH_NIGHTS = 366;
export const MAX_SITE_PROPERTY_SEARCH_GUESTS = 50;

const DAY_MS = 24 * 60 * 60 * 1000;
const PROPERTY_NOT_FOUND_CODE = "property_not_found";
const NOT_FREE_REASONS = Object.freeze({
  unavailable_dates: "Not free on these dates.",
  stay_restriction_violation: "These dates don't meet the stay rules of this property.",
  invalid_guest_count: "This property can't host this many guests.",
  quote_unavailable: "This property can't be booked online right now.",
  invalid_date_range: "These dates can't be booked.",
});
const SERVER_REASON_CODES = new Set(["stay_restriction_violation", "invalid_guest_count"]);

const cleanText = (value) => (typeof value === "string" ? value.replaceAll(/\s+/g, " ").trim() : "");

const readCount = (value) => (Number.isInteger(value) && value > 0 ? value : 0);

const toUtcDay = (dateKey) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
};

export const formatCount = (count, word, plural = `${word}s`) => `${count} ${count === 1 ? word : plural}`;

export const describeSitePropertyCard = ({ location, guests, bedrooms }) =>
  [location, guests ? formatCount(guests, "guest") : "", bedrooms ? formatCount(bedrooms, "bedroom") : ""]
    .filter(Boolean)
    .join(" · ");

export const countSearchNights = (checkIn, checkOut) => Math.round((toUtcDay(checkOut) - toUtcDay(checkIn)) / DAY_MS);

export const buildSitePropertyCards = ({ siteModel, siteProperties, contentOverrides, themeOverrides, templateKey }) =>
  siteProperties.map((property) => {
    const model = buildSitePropertyModel({ siteModel, property, contentOverrides, themeOverrides, templateKey });
    const imageUrl = cleanText(model.media?.heroImage);
    const city = cleanText(model.location?.city);
    return {
      propertyId: property.propertyId,
      slug: property.slug,
      title: cleanText(model.hero?.title),
      imageUrl: imageUrl === placeholderImage ? "" : imageUrl,
      city,
      location: [city, cleanText(model.location?.country)].filter(Boolean).join(", "),
      guests: readCount(model.stay?.guests),
      bedrooms: readCount(model.stay?.bedrooms),
    };
  });

export const listSitePropertyCities = (cards) => {
  const cities = new Map();
  cards.forEach(({ city }) => {
    if (city && !cities.has(city.toLowerCase())) {
      cities.set(city.toLowerCase(), city);
    }
  });
  return [...cities].map(([key, label]) => ({ key, label }));
};

export const validateSitePropertySearch = ({ checkIn, checkOut, guests }, todayKey) => {
  if (!isValidDateKey(checkIn) || !isValidDateKey(checkOut)) {
    return "Choose a check-in and a check-out date.";
  }
  if (checkIn < todayKey) {
    return "Check-in can't be in the past.";
  }
  if (checkOut <= checkIn) {
    return "Check-out must be after check-in.";
  }
  if (countSearchNights(checkIn, checkOut) > MAX_SITE_PROPERTY_SEARCH_NIGHTS) {
    return `A stay can be at most ${MAX_SITE_PROPERTY_SEARCH_NIGHTS} nights.`;
  }
  const isGuestCount = Number.isInteger(guests) && guests >= 1 && guests <= MAX_SITE_PROPERTY_SEARCH_GUESTS;
  return isGuestCount ? "" : `Choose 1 to ${MAX_SITE_PROPERTY_SEARCH_GUESTS} guests.`;
};

const resolveNotFreeReason = ({ code, message } = {}) =>
  Object.hasOwn(NOT_FREE_REASONS, code)
    ? (SERVER_REASON_CODES.has(code) && cleanText(message)) || NOT_FREE_REASONS[code]
    : "";

export const groupSitePropertySearchResults = (cards, answers, criteria) => {
  const groups = { free: [], notFree: [], failed: [] };
  cards.forEach((card) => {
    const { quote, error } = answers.get(card.propertyId) || {};
    const reason = resolveNotFreeReason(error);
    if (quote && quoteMatchesSelection(quote, criteria)) {
      groups.free.push({ card, quote });
    } else if (reason) {
      groups.notFree.push({ card, reason });
    } else if (error?.code !== PROPERTY_NOT_FOUND_CODE) {
      groups.failed.push(card);
    }
  });
  return groups;
};

export const buildSitePropertyStayQuery = (pageSearch, { checkIn, checkOut, guests }) =>
  `${pageSearch}${pageSearch ? "&" : "?"}checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`;
