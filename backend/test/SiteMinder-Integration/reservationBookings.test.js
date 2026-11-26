import { describe, expect, test } from "@jest/globals";
import {
  RESERVATION_ERROR,
  SITEMINDER_BOOKING_PROFILE,
  planReservationBookings,
} from "../../functions/SiteMinder-Integration/util/reservationBookings.js";

const DAY_MS = 86_400_000;
const ARRIVAL_MS = Date.UTC(2027, 2, 12);

const room = (overrides = {}) => ({
  roomTypeCode: "VILLA-A",
  ratePlanCodes: ["BAR"],
  arrival: "2027-03-12",
  departure: "2027-03-15",
  adults: 2,
  children: 1,
  infants: 1,
  total: { amountBeforeTax: 450, amountAfterTax: 495, currency: "EUR" },
  ...overrides,
});

const reservation = (overrides = {}) => ({
  status: "Book",
  siteMinderId: "SM-1",
  messageId: "msg-1",
  hotelCode: "PMSXTEST1",
  channel: { code: "BDC", name: "Booking.com" },
  rooms: [room()],
  guest: { firstName: "Ana", lastName: "Silva", email: "ana@example.com", phone: null },
  total: null,
  ...overrides,
});

const MAPPED = new Map([
  ["VILLA-A", "property-a"],
  ["VILLA-B", "property-b"],
]);

const plan = (input, mapped = MAPPED) => planReservationBookings(input, { roomTypeToProperty: mapped, currency: "EUR" });

describe("SITEMINDER_BOOKING_PROFILE", () => {
  test("marks every imported booking as SiteMinder, like the Channex profile does for Channex", () => {
    expect(SITEMINDER_BOOKING_PROFILE).toEqual({
      channel: "SITEMINDER",
      guestIdPrefix: "SITEMINDER_GUEST",
      paymentIdPrefix: "SITEMINDER",
      hostName: "SiteMinder",
      bookingType: "siteminder",
      fallbackGuestName: "SiteMinder guest",
    });
    expect(Object.isFrozen(SITEMINDER_BOOKING_PROFILE)).toBe(true);
  });
});

describe("planReservationBookings", () => {
  test("turns one room into one Domits booking on the mapped property", () => {
    expect(plan(reservation())).toEqual({
      bookings: [
        {
          roomKey: "SM-1:VILLA-A:1",
          domitsPropertyId: "property-a",
          arrivalDateMs: ARRIVAL_MS,
          departureDateMs: ARRIVAL_MS + 3 * DAY_MS,
          guestName: "Ana Silva",
          guestCount: 3,
          totalPrice: 495,
          bookingSource: "Booking.com",
        },
      ],
    });
  });

  test("turns a reservation for two villas into two bookings, one per room", () => {
    const result = plan(reservation({ rooms: [room(), room({ roomTypeCode: "VILLA-B" })] }));

    expect(result.bookings.map(({ roomKey, domitsPropertyId }) => [roomKey, domitsPropertyId])).toEqual([
      ["SM-1:VILLA-A:1", "property-a"],
      ["SM-1:VILLA-B:1", "property-b"],
    ]);
  });

  test("numbers rooms of the same room type, so each one keeps its own key", () => {
    const result = plan(reservation({ rooms: [room(), room()] }));

    expect(result.bookings.map((booking) => booking.roomKey)).toEqual(["SM-1:VILLA-A:1", "SM-1:VILLA-A:2"]);
  });

  test("keeps the key of a room when the room order changes in a later change of the reservation", () => {
    const first = plan(reservation({ rooms: [room(), room({ roomTypeCode: "VILLA-B" })] }));
    const swapped = plan(reservation({ rooms: [room({ roomTypeCode: "VILLA-B" }), room()] }));

    const keyOf = (result, propertyId) => result.bookings.find((b) => b.domitsPropertyId === propertyId).roomKey;
    expect(keyOf(swapped, "property-a")).toBe(keyOf(first, "property-a"));
    expect(keyOf(swapped, "property-b")).toBe(keyOf(first, "property-b"));
  });

  test("refuses the whole reservation when one room type is not linked to a Domits property", () => {
    const result = plan(reservation({ rooms: [room(), room({ roomTypeCode: "VILLA-X" })] }));

    expect(result).toEqual({ error: RESERVATION_ERROR.ROOM_TYPE_NOT_LINKED });
  });

  test.each([
    ["no rooms", { rooms: [] }],
    ["a room without a room type", { rooms: [room({ roomTypeCode: null })] }],
    ["a departure on the arrival day", { rooms: [room({ departure: "2027-03-12" })] }],
    ["a departure before the arrival", { rooms: [room({ departure: "2027-03-10" })] }],
    ["an arrival that is not a date", { rooms: [room({ arrival: "12-03-2027" })] }],
    ["an arrival that does not exist", { rooms: [room({ arrival: "2027-02-30" })] }],
    ["a missing departure", { rooms: [room({ departure: null })] }],
  ])("refuses a reservation with %s", (_label, overrides) => {
    expect(plan(reservation(overrides))).toEqual({ error: RESERVATION_ERROR.INVALID_RESERVATION });
  });

  test("uses the SiteMinder error codes, with fixed texts that hold no guest data", () => {
    expect(RESERVATION_ERROR).toEqual({
      HOTEL_NOT_LINKED: { type: 3, code: 392, message: "Hotel is not linked to a Domits host" },
      ROOM_TYPE_NOT_LINKED: { type: 3, code: 402, message: "Room type is not linked to a Domits property" },
      INVALID_RESERVATION: { type: 3, code: 321, message: "Reservation has no rooms or no valid stay dates" },
    });
  });

  test("leaves the guest name empty without a name, so the profile's fallback name is used", () => {
    const [booking] = plan(reservation({ guest: null })).bookings;
    expect(booking.guestName).toBeNull();

    const [onlyLast] = plan(reservation({ guest: { firstName: null, lastName: "Silva" } })).bookings;
    expect(onlyLast.guestName).toBe("Silva");
  });

  test("counts adults and children as guests, and leaves the count empty when it is zero", () => {
    expect(plan(reservation({ rooms: [room({ adults: 1, children: 0, infants: 2 })] })).bookings[0].guestCount).toBe(1);
    expect(plan(reservation({ rooms: [room({ adults: 0, children: 0 })] })).bookings[0].guestCount).toBeNull();
  });

  test("keeps the room price only in the Domits currency, and prefers the price after tax", () => {
    const priceOf = (total) => plan(reservation({ rooms: [room({ total })] })).bookings[0].totalPrice;

    expect(priceOf({ amountBeforeTax: 450, amountAfterTax: null, currency: "EUR" })).toBe(450);
    expect(priceOf({ amountBeforeTax: 450, amountAfterTax: 495, currency: "USD" })).toBeNull();
    expect(priceOf({ amountBeforeTax: null, amountAfterTax: Number.NaN, currency: "EUR" })).toBeNull();
    expect(priceOf({ amountBeforeTax: -10, amountAfterTax: null, currency: "EUR" })).toBeNull();
    expect(priceOf(null)).toBeNull();
  });

  test("names the channel the guest booked on, or SiteMinder when the channel is unknown", () => {
    expect(plan(reservation({ channel: { code: "EXP", name: null } })).bookings[0].bookingSource).toBe("EXP");
    expect(plan(reservation({ channel: null })).bookings[0].bookingSource).toBe("SiteMinder");
  });
});
