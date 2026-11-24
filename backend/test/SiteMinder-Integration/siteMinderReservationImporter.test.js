import { beforeEach, describe, expect, test } from "@jest/globals";
import { buildDeterministicBookingId } from "../../functions/.shared/channelManagement/repositories/channexExternalBookingImportRepository.js";
import { SiteMinderReservationImporter } from "../../functions/SiteMinder-Integration/business/siteMinderReservationImporter.js";
import { RESERVATION_ERROR } from "../../functions/SiteMinder-Integration/util/reservationBookings.js";
import { fakeTables } from "./siteMinderFakeTables.js";

const NOW = Date.UTC(2026, 10, 16, 10, 0, 0);
const NOW_ISO = "2026-11-16T10:00:00.000Z";
const DAY_MS = 86_400_000;
const ARRIVAL_MS = Date.UTC(2027, 2, 12);
const ACCOUNT_ID = "account-1";

const bookingIdOf = (roomKey) => buildDeterministicBookingId("SITEMINDER", ACCOUNT_ID, roomKey);

const room = (overrides = {}) => ({
  roomTypeCode: "VILLA-A",
  ratePlanCodes: ["BAR"],
  arrival: "2027-03-12",
  departure: "2027-03-15",
  adults: 2,
  children: 0,
  infants: 0,
  total: { amountBeforeTax: 450, amountAfterTax: 495, currency: "EUR" },
  ...overrides,
});

const reservation = (overrides = {}) => ({
  status: "Book",
  siteMinderId: "SM-1",
  messageId: "msg-1",
  hotelCode: "HOTEL-1",
  channel: { code: "BDC", name: "Booking.com" },
  rooms: [room()],
  guest: { firstName: "Ana", lastName: "Silva", email: null, phone: null },
  total: null,
  ...overrides,
});

function fakeBookings({ properties }) {
  const rows = new Map();
  const calls = { create: [], update: [], cancel: [] };
  return {
    rows,
    calls,
    failNextCreate: null,
    failCreateOf: null,
    getDomitsPropertyContext: async (propertyId) => properties[propertyId] ?? null,
    getBookingById: async (id) => rows.get(id) ?? null,
    async createExternalBooking(input) {
      if (this.failNextCreate) {
        const error = this.failNextCreate;
        this.failNextCreate = null;
        throw error;
      }
      if (this.failCreateOf === input.bookingId) {
        throw new Error("connection reset");
      }
      calls.create.push(input);
      rows.set(input.bookingId, {
        id: input.bookingId,
        propertyId: input.propertyId,
        arrivalDateMs: input.arrivalDateMs,
        departureDateMs: input.departureDateMs,
        status: "Paid",
      });
      return rows.get(input.bookingId);
    },
    async updateImportedBooking(input) {
      calls.update.push(input);
      Object.assign(rows.get(input.bookingId), {
        arrivalDateMs: input.arrivalDateMs,
        departureDateMs: input.departureDateMs,
        status: "Paid",
      });
      return rows.get(input.bookingId);
    },
    async cancelImportedBooking(bookingId, changes) {
      calls.cancel.push({ bookingId, changes });
      rows.get(bookingId).status = "Cancelled";
      return rows.get(bookingId);
    },
  };
}

function fakeLinks() {
  const rows = [];
  return {
    rows,
    getByIntegrationAccountIdAndExternalReservation: async ({ integrationAccountId, channel, externalReservationId }) =>
      rows.find(
        (row) =>
          row.integrationAccountId === integrationAccountId &&
          row.channel === channel &&
          row.externalReservationId === externalReservationId
      ) ?? null,
    async upsert(data) {
      const existing = await this.getByIntegrationAccountIdAndExternalReservation(data);
      if (existing) {
        Object.assign(existing, data);
        return existing;
      }
      rows.push({ ...data });
      return data;
    },
  };
}

const roomKeysOf = (link) => JSON.parse(link.rawPayload).roomKeys;

describe("SiteMinderReservationImporter", () => {
  let tables;
  let bookings;
  let links;
  let importer;

  const linkRoomType = (roomTypeCode, domitsPropertyId, status = "ACTIVE") =>
    tables.rows.roomTypes.push({
      integrationAccountId: ACCOUNT_ID,
      domitsPropertyId,
      externalPropertyId: "HOTEL-1",
      externalRoomTypeId: roomTypeCode,
      status,
    });

  beforeEach(() => {
    tables = fakeTables();
    tables.rows.accounts.push({ id: ACCOUNT_ID, userId: "host-1", channel: "SITEMINDER", status: "CONNECTED" });
    tables.rows.props.push({
      integrationAccountId: ACCOUNT_ID,
      domitsPropertyId: "property-a",
      externalPropertyId: "HOTEL-1",
      status: "ACTIVE",
    });
    linkRoomType("VILLA-A", "property-a");
    linkRoomType("VILLA-B", "property-b");
    bookings = fakeBookings({
      properties: {
        "property-a": { propertyId: "property-a", hostId: "host-1" },
        "property-b": { propertyId: "property-b", hostId: "host-1" },
        "property-c": { propertyId: "property-c", hostId: "host-1" },
      },
    });
    links = fakeLinks();
    importer = new SiteMinderReservationImporter({
      ...tables,
      bookings,
      resLinks: links,
      currency: "EUR",
      now: () => NOW,
    });
  });

  test("saves a new reservation as a Domits booking and closes its nights on the other channels", async () => {
    const result = await importer.importReservation(reservation());

    expect(bookings.calls.create).toEqual([
      {
        bookingId: bookingIdOf("SM-1:VILLA-A:1"),
        propertyId: "property-a",
        hostId: "host-1",
        externalReservationId: "SM-1:VILLA-A:1",
        guestName: "Ana Silva",
        arrivalDateMs: ARRIVAL_MS,
        departureDateMs: ARRIVAL_MS + 3 * DAY_MS,
        totalPrice: 495,
        currency: "EUR",
        guestCount: 2,
        bookingSource: "Booking.com",
        channexChanges: [
          {
            domitsPropertyId: "property-a",
            changeTypes: ["availability"],
            dateFrom: "2027-03-12",
            dateTo: "2027-03-14",
            source: "SITEMINDER_IMPORT",
          },
        ],
      },
    ]);
    expect(result).toEqual({
      confirmation: { status: "Book", messageId: "msg-1", bookingId: bookingIdOf("SM-1:VILLA-A:1"), processedAt: NOW_ISO },
    });
  });

  test("remembers which rooms belong to the reservation, so a later change or cancel finds them", async () => {
    await importer.importReservation(reservation({ rooms: [room(), room({ roomTypeCode: "VILLA-B" })] }));

    expect(links.rows).toHaveLength(1);
    expect(links.rows[0]).toMatchObject({
      integrationAccountId: ACCOUNT_ID,
      channel: "SITEMINDER",
      externalReservationId: "SM-1",
      domitsPropertyId: "property-a",
      checkInAt: ARRIVAL_MS,
      checkOutAt: ARRIVAL_MS + 3 * DAY_MS,
      reservationStatus: "Paid",
    });
    expect(roomKeysOf(links.rows[0])).toEqual(["SM-1:VILLA-A:1", "SM-1:VILLA-B:1"]);
  });

  test("saves a reservation for two villas as two bookings and confirms it with the first booking", async () => {
    const result = await importer.importReservation(reservation({ rooms: [room(), room({ roomTypeCode: "VILLA-B" })] }));

    expect(bookings.calls.create.map((call) => [call.bookingId, call.propertyId])).toEqual([
      [bookingIdOf("SM-1:VILLA-A:1"), "property-a"],
      [bookingIdOf("SM-1:VILLA-B:1"), "property-b"],
    ]);
    expect(result.confirmation.bookingId).toBe(bookingIdOf("SM-1:VILLA-A:1"));
  });

  test("does not save a booking twice when SiteMinder delivers the same reservation again", async () => {
    await importer.importReservation(reservation());
    const again = await importer.importReservation(reservation());

    expect(bookings.calls.create).toHaveLength(1);
    expect(bookings.rows.size).toBe(1);
    expect(again.confirmation.bookingId).toBe(bookingIdOf("SM-1:VILLA-A:1"));
  });

  test("refuses a hotel that no Domits host has linked, and saves nothing", async () => {
    const result = await importer.importReservation(reservation({ hotelCode: "HOTEL-UNKNOWN" }));

    expect(result).toEqual({ failure: RESERVATION_ERROR.HOTEL_NOT_LINKED });
    expect(bookings.rows.size).toBe(0);
    expect(links.rows).toHaveLength(0);
  });

  test("refuses a hotel that is linked through another channel than SiteMinder", async () => {
    tables.rows.accounts[0].channel = "CHANNEX";

    expect(await importer.importReservation(reservation())).toEqual({ failure: RESERVATION_ERROR.HOTEL_NOT_LINKED });
  });

  test("refuses the whole reservation when one room type is not linked, before saving any room", async () => {
    const result = await importer.importReservation(reservation({ rooms: [room(), room({ roomTypeCode: "VILLA-X" })] }));

    expect(result).toEqual({ failure: RESERVATION_ERROR.ROOM_TYPE_NOT_LINKED });
    expect(bookings.rows.size).toBe(0);
  });

  test("ignores a room type link that the host turned off", async () => {
    tables.rows.roomTypes.find((row) => row.externalRoomTypeId === "VILLA-B").status = "INACTIVE";

    const result = await importer.importReservation(reservation({ rooms: [room({ roomTypeCode: "VILLA-B" })] }));

    expect(result).toEqual({ failure: RESERVATION_ERROR.ROOM_TYPE_NOT_LINKED });
  });

  test("refuses a reservation for a Domits property that no longer exists, before saving any room", async () => {
    bookings.getDomitsPropertyContext = async (propertyId) =>
      propertyId === "property-a" ? { propertyId, hostId: "host-1" } : null;

    const result = await importer.importReservation(reservation({ rooms: [room(), room({ roomTypeCode: "VILLA-B" })] }));

    expect(result).toEqual({ failure: RESERVATION_ERROR.ROOM_TYPE_NOT_LINKED });
    expect(bookings.rows.size).toBe(0);
  });

  test("refuses a reservation without valid stay dates", async () => {
    const result = await importer.importReservation(reservation({ rooms: [room({ departure: "2027-03-12" })] }));

    expect(result).toEqual({ failure: RESERVATION_ERROR.INVALID_RESERVATION });
  });

  test("changes the dates of a saved booking and reopens the old nights while closing the new ones", async () => {
    await importer.importReservation(reservation());

    const result = await importer.importReservation(
      reservation({ status: "Modify", messageId: "msg-2", rooms: [room({ arrival: "2027-03-20", departure: "2027-03-22" })] })
    );

    expect(bookings.calls.update).toEqual([
      expect.objectContaining({
        bookingId: bookingIdOf("SM-1:VILLA-A:1"),
        arrivalDateMs: Date.UTC(2027, 2, 20),
        departureDateMs: Date.UTC(2027, 2, 22),
        guestName: "Ana Silva",
        channexChanges: [
          expect.objectContaining({ dateFrom: "2027-03-12", dateTo: "2027-03-14", source: "SITEMINDER_IMPORT" }),
          expect.objectContaining({ dateFrom: "2027-03-20", dateTo: "2027-03-21", source: "SITEMINDER_IMPORT" }),
        ],
      }),
    ]);
    expect(result).toEqual({
      confirmation: { status: "Modify", messageId: "msg-2", bookingId: bookingIdOf("SM-1:VILLA-A:1"), processedAt: NOW_ISO },
    });
  });

  test("cancels a room that a change removed, and saves a room that it added", async () => {
    await importer.importReservation(reservation({ rooms: [room(), room({ roomTypeCode: "VILLA-B" })] }));

    await importer.importReservation(reservation({ status: "Modify", messageId: "msg-2", rooms: [room()] }));

    expect(bookings.calls.cancel.map((call) => call.bookingId)).toEqual([bookingIdOf("SM-1:VILLA-B:1")]);
    expect(bookings.calls.cancel[0].changes).toEqual([
      expect.objectContaining({ domitsPropertyId: "property-b", dateFrom: "2027-03-12", source: "SITEMINDER_IMPORT" }),
    ]);
    expect(roomKeysOf(links.rows[0])).toEqual(["SM-1:VILLA-A:1"]);

    await importer.importReservation(
      reservation({ status: "Modify", messageId: "msg-3", rooms: [room(), room({ roomTypeCode: "VILLA-B" })] })
    );
    expect(bookings.rows.get(bookingIdOf("SM-1:VILLA-B:1")).status).toBe("Paid");
    expect(roomKeysOf(links.rows[0])).toEqual(["SM-1:VILLA-A:1", "SM-1:VILLA-B:1"]);
  });

  test("saves a change for a reservation Domits never saved as a new booking", async () => {
    const result = await importer.importReservation(reservation({ status: "Modify" }));

    expect(bookings.calls.create).toHaveLength(1);
    expect(result.confirmation.status).toBe("Modify");
  });

  test("cancels every booking of a cancelled reservation and reopens their nights", async () => {
    await importer.importReservation(reservation({ rooms: [room(), room({ roomTypeCode: "VILLA-B" })] }));

    const result = await importer.importReservation(reservation({ status: "Cancel", messageId: "msg-2", rooms: [] }));

    expect(bookings.calls.cancel.map((call) => call.bookingId)).toEqual([
      bookingIdOf("SM-1:VILLA-A:1"),
      bookingIdOf("SM-1:VILLA-B:1"),
    ]);
    expect(links.rows[0].reservationStatus).toBe("Cancelled");
    expect(result).toEqual({
      confirmation: { status: "Cancel", messageId: "msg-2", bookingId: bookingIdOf("SM-1:VILLA-A:1"), processedAt: NOW_ISO },
    });
  });

  test("still finds the bookings to cancel after the host unlinked the room type", async () => {
    await importer.importReservation(reservation());
    tables.rows.roomTypes.forEach((row) => {
      row.status = "INACTIVE";
    });

    await importer.importReservation(reservation({ status: "Cancel", messageId: "msg-2", rooms: [] }));

    expect(bookings.calls.cancel.map((call) => call.bookingId)).toEqual([bookingIdOf("SM-1:VILLA-A:1")]);
  });

  test("does not cancel a booking twice when SiteMinder delivers the cancel again", async () => {
    await importer.importReservation(reservation());
    await importer.importReservation(reservation({ status: "Cancel", messageId: "msg-2", rooms: [] }));

    await importer.importReservation(reservation({ status: "Cancel", messageId: "msg-2", rooms: [] }));

    expect(bookings.calls.cancel).toHaveLength(1);
  });

  test("confirms a cancel for a reservation Domits never saved, with the reservation's own id", async () => {
    const result = await importer.importReservation(reservation({ status: "Cancel", rooms: [] }));

    expect(bookings.calls.cancel).toHaveLength(0);
    expect(result.confirmation.bookingId).toBe(bookingIdOf("SM-1"));
  });

  test("lets a database error through, so the reservation is not confirmed and comes back on the next read", async () => {
    bookings.failNextCreate = new Error("connection reset");

    await expect(importer.importReservation(reservation())).rejects.toThrow("connection reset");
    expect(links.rows).toHaveLength(0);
  });

  test("saves the price with its currency on a new booking and on a change, so pounds never show as euros", async () => {
    importer = new SiteMinderReservationImporter({ ...tables, bookings, resLinks: links, currency: "GBP", now: () => NOW });
    const villaInPounds = room({ total: { amountBeforeTax: 450, amountAfterTax: 495, currency: "GBP" } });

    await importer.importReservation(reservation({ rooms: [villaInPounds] }));
    await importer.importReservation(reservation({ status: "Modify", messageId: "msg-2", rooms: [villaInPounds] }));

    expect(bookings.calls.create[0]).toMatchObject({ totalPrice: 495, currency: "GBP" });
    expect(bookings.calls.update[0]).toMatchObject({ totalPrice: 495, currency: "GBP" });
  });

  test("saves no currency when the price is in another currency, so the price and its currency stay a pair", async () => {
    const villaInDollars = room({ total: { amountBeforeTax: 450, amountAfterTax: 495, currency: "USD" } });

    await importer.importReservation(reservation({ rooms: [villaInDollars] }));

    expect(bookings.calls.create[0]).toMatchObject({ totalPrice: null, currency: null });
  });

  test("keeps the nights of a change on the booking's own property after its room type was linked to another one", async () => {
    await importer.importReservation(reservation());
    tables.rows.roomTypes.find((row) => row.externalRoomTypeId === "VILLA-A").status = "INACTIVE";
    linkRoomType("VILLA-A", "property-c");

    const later = room({ arrival: "2027-03-20", departure: "2027-03-22" });
    await importer.importReservation(reservation({ status: "Modify", messageId: "msg-2", rooms: [later] }));

    expect(bookings.calls.update).toHaveLength(1);
    expect(bookings.calls.update[0].channexChanges.map((change) => change.domitsPropertyId)).toEqual(["property-a", "property-a"]);
  });

  test("recovers a reservation for two villas whose second room failed, without a second booking for the first", async () => {
    const twoVillas = reservation({ rooms: [room(), room({ roomTypeCode: "VILLA-B" })] });
    bookings.failCreateOf = bookingIdOf("SM-1:VILLA-B:1");

    await expect(importer.importReservation(twoVillas)).rejects.toThrow("connection reset");
    expect(links.rows).toHaveLength(0);

    bookings.failCreateOf = null;
    const result = await importer.importReservation(twoVillas);

    expect(bookings.calls.create.map((call) => call.bookingId)).toEqual([
      bookingIdOf("SM-1:VILLA-A:1"),
      bookingIdOf("SM-1:VILLA-B:1"),
    ]);
    expect(bookings.calls.update.map((call) => call.bookingId)).toEqual([bookingIdOf("SM-1:VILLA-A:1")]);
    expect(bookings.rows.size).toBe(2);
    expect(roomKeysOf(links.rows[0])).toEqual(["SM-1:VILLA-A:1", "SM-1:VILLA-B:1"]);
    expect(result.confirmation.bookingId).toBe(bookingIdOf("SM-1:VILLA-A:1"));
  });

  test("books a room again when a later change adds it back after an earlier change removed it", async () => {
    const villaB = room({ roomTypeCode: "VILLA-B" });
    await importer.importReservation(reservation({ rooms: [room(), villaB] }));
    await importer.importReservation(reservation({ status: "Modify", messageId: "msg-2", rooms: [room()] }));
    await importer.importReservation(reservation({ status: "Modify", messageId: "msg-3", rooms: [room(), villaB] }));

    expect(bookings.calls.cancel.map((call) => call.bookingId)).toEqual([bookingIdOf("SM-1:VILLA-B:1")]);
    expect(bookings.calls.update.map((call) => call.bookingId)).toContain(bookingIdOf("SM-1:VILLA-B:1"));
    expect(bookings.rows.get(bookingIdOf("SM-1:VILLA-B:1")).status).toBe("Paid");
    expect(roomKeysOf(links.rows[0])).toEqual(["SM-1:VILLA-A:1", "SM-1:VILLA-B:1"]);
  });
});
