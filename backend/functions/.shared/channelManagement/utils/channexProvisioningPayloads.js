// Field rules from the Channex API docs (properties, room_types, rate_plans; read 23 Nov 2026), design note D2.

const CURRENCY = "EUR";
const MAX_TEXT = 255;
const MAX_PHONE = 32;
const MAX_ZIP_CODE = 32;
const RATE_PLAN_TITLE = "Standard Rate";

// Channex bills a property as a hotel unless property_type is a vacation-rental type, so an unknown
// Domits type falls back to holiday_home and is never sent empty.
const PROPERTY_TYPES = Object.freeze({ Villa: "villa", Apartment: "apartment", Boat: "boat" });
const FALLBACK_PROPERTY_TYPE = "holiday_home";

export const toChannexPropertyType = (domitsType) => PROPERTY_TYPES[domitsType] ?? FALLBACK_PROPERTY_TYPE;

const textOrNull = (value, maxLength = MAX_TEXT) => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text.slice(0, maxLength) : null;
};

// A phone number cut short would reach the wrong person, so a too-long one is left out instead.
const phoneOrNull = (value) => {
  const phone = textOrNull(value, Number.MAX_SAFE_INTEGER);
  return phone && phone.length <= MAX_PHONE ? phone : null;
};

// Channex takes coordinates as decimal strings with at most 7 decimals.
const coordinateOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(7) : null;
};

const addressOf = ({ street, houseNumber, houseNumberExtension } = {}) =>
  textOrNull([textOrNull(street), textOrNull(`${houseNumber ?? ""}${houseNumberExtension ?? ""}`)].filter(Boolean).join(" "));

export const buildChannexPropertyPayload = (listing, { countryCode, timezone }) => {
  const location = listing.location ?? {};
  return {
    property: {
      title: textOrNull(listing.title),
      currency: CURRENCY,
      property_type: toChannexPropertyType(listing.propertyType),
      country: countryCode,
      timezone,
      city: textOrNull(location.city),
      address: addressOf(location),
      zip_code: textOrNull(location.postalCode, MAX_ZIP_CODE),
      latitude: coordinateOrNull(location.latitude),
      longitude: coordinateOrNull(location.longitude),
      email: textOrNull(listing.contact?.email),
      phone: phoneOrNull(listing.contact?.phone),
      // Domits pushes availability itself; Channex recommends leaving these off for a PMS.
      settings: {
        allow_availability_autoupdate_on_modification: false,
        allow_availability_autoupdate_on_cancellation: false,
      },
    },
  };
};

// One unit: Channex bills vacation rentals per unit (count_of_rooms), and a Domits listing is one place.
export const buildChannexRoomTypePayload = (listing, { channexPropertyId }) => ({
  room_type: {
    property_id: channexPropertyId,
    title: textOrNull(listing.title),
    count_of_rooms: 1,
    occ_adults: listing.guests,
    occ_children: 0,
    occ_infants: 0,
    default_occupancy: listing.guests,
  },
});

// A per-room plan has one option at the maximum occupancy; the real prices follow through the outbox.
export const buildChannexRatePlanPayload = (listing, { channexPropertyId, channexRoomTypeId }) => ({
  rate_plan: {
    property_id: channexPropertyId,
    room_type_id: channexRoomTypeId,
    title: RATE_PLAN_TITLE,
    currency: CURRENCY,
    sell_mode: "per_room",
    rate_mode: "manual",
    options: [{ occupancy: listing.guests, is_primary: true, rate: 0 }],
  },
});
