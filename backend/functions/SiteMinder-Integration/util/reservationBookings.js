import { SITEMINDER_CHANNEL } from "./siteMinderConfig.js";

export const SITEMINDER_BOOKING_PROFILE = Object.freeze({
  channel: SITEMINDER_CHANNEL,
  guestIdPrefix: "SITEMINDER_GUEST",
  paymentIdPrefix: "SITEMINDER",
  hostName: "SiteMinder",
  bookingType: "siteminder",
  fallbackGuestName: "SiteMinder guest",
});

const BIZ_RULE = 3;

export const RESERVATION_ERROR = Object.freeze({
  HOTEL_NOT_LINKED: Object.freeze({ type: BIZ_RULE, code: 392, message: "Hotel is not linked to a Domits host" }),
  ROOM_TYPE_NOT_LINKED: Object.freeze({
    type: BIZ_RULE,
    code: 402,
    message: "Room type is not linked to a Domits property",
  }),
  INVALID_RESERVATION: Object.freeze({
    type: BIZ_RULE,
    code: 321,
    message: "Reservation has no rooms or no valid stay dates",
  }),
});

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const dateToUtcMs = (value) => {
  const match = DATE.exec(String(value ?? ""));
  if (!match) {
    return null;
  }
  const [, year, month, day] = match.map(Number);
  const ms = Date.UTC(year, month - 1, day);
  const date = new Date(ms);
  const sameDay = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return sameDay ? ms : null;
};

const stayOf = (room) => {
  const arrivalDateMs = dateToUtcMs(room.arrival);
  const departureDateMs = dateToUtcMs(room.departure);
  const valid = arrivalDateMs !== null && departureDateMs !== null && departureDateMs > arrivalDateMs;
  return valid ? { arrivalDateMs, departureDateMs } : null;
};

const guestNameOf = (guest) => [guest?.firstName, guest?.lastName].filter(Boolean).join(" ") || null;

const guestCountOf = (room) => {
  const count = (Number(room.adults) || 0) + (Number(room.children) || 0);
  return count > 0 ? count : null;
};

const isPrice = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;

const priceOf = (total, currency) => {
  if (total?.currency !== currency) {
    return null;
  }
  return [total.amountAfterTax, total.amountBeforeTax].find(isPrice) ?? null;
};

const bookingSourceOf = (channel) => channel?.name || channel?.code || SITEMINDER_BOOKING_PROFILE.hostName;

const withRoomKeys = (siteMinderId, rooms) => {
  const seen = new Map();
  return rooms.map((room) => {
    const occurrence = (seen.get(room.roomTypeCode) ?? 0) + 1;
    seen.set(room.roomTypeCode, occurrence);
    return { room, roomKey: `${siteMinderId}:${room.roomTypeCode}:${occurrence}` };
  });
};

export const planReservationBookings = (reservation, { roomTypeToProperty, currency }) => {
  const rooms = Array.isArray(reservation?.rooms) ? reservation.rooms : [];
  const stays = rooms.map(stayOf);
  if (rooms.length === 0 || rooms.some((room) => !room.roomTypeCode) || stays.includes(null)) {
    return { error: RESERVATION_ERROR.INVALID_RESERVATION };
  }
  if (rooms.some((room) => !roomTypeToProperty.has(room.roomTypeCode))) {
    return { error: RESERVATION_ERROR.ROOM_TYPE_NOT_LINKED };
  }

  const guestName = guestNameOf(reservation.guest);
  const bookingSource = bookingSourceOf(reservation.channel);
  const bookings = withRoomKeys(reservation.siteMinderId, rooms).map(({ room, roomKey }, index) => ({
    roomKey,
    domitsPropertyId: roomTypeToProperty.get(room.roomTypeCode),
    ...stays[index],
    guestName,
    guestCount: guestCountOf(room),
    totalPrice: priceOf(room.total, currency),
    bookingSource,
  }));
  return { bookings };
};
