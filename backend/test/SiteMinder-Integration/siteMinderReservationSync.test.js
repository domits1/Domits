import { describe, expect, jest, test } from "@jest/globals";
import { SiteMinderReservationSync } from "../../functions/SiteMinder-Integration/business/siteMinderReservationSync.js";
import { RESERVATION_ERROR } from "../../functions/SiteMinder-Integration/util/reservationBookings.js";

const NOW = Date.UTC(2026, 10, 16, 10, 0, 0);
const NOW_ISO = "2026-11-16T10:00:00.000Z";

const reservation = (messageId, overrides = {}) => ({
  status: "Book",
  siteMinderId: `SM-${messageId}`,
  messageId,
  hotelCode: "HOTEL-1",
  rooms: [],
  guest: { firstName: "Ana", lastName: "Silva", email: "ana@example.com", phone: null },
  ...overrides,
});

const confirmationOf = (r) => ({ status: r.status, messageId: r.messageId, bookingId: `booking-${r.messageId}`, processedAt: NOW_ISO });

const setup = ({ reservations = [], skipped = 0, outcomes = {} } = {}) => {
  const reader = {
    readUndelivered: jest.fn(async () => ({ reservations, skipped })),
    confirm: jest.fn(async () => ({ success: true })),
    reportFailure: jest.fn(async () => ({ success: true })),
  };
  const importer = {
    importReservation: jest.fn(async (r) => {
      const outcome = outcomes[r.messageId];
      if (outcome instanceof Error) throw outcome;
      return outcome ?? { confirmation: confirmationOf(r) };
    }),
  };
  const logger = { info: jest.fn(), warn: jest.fn() };
  const sync = new SiteMinderReservationSync({ reader, importer, logger, now: () => NOW });
  return { reader, importer, logger, sync };
};

describe("SiteMinderReservationSync", () => {
  test("saves every reservation and confirms the saved ones together in one message", async () => {
    const reservations = [reservation("msg-1"), reservation("msg-2", { status: "Modify" })];
    const { reader, sync } = setup({ reservations });

    const summary = await sync.run();

    expect(reader.confirm).toHaveBeenCalledTimes(1);
    expect(reader.confirm).toHaveBeenCalledWith(reservations.map(confirmationOf), { now: new Date(NOW) });
    expect(reader.reportFailure).not.toHaveBeenCalled();
    expect(summary).toEqual({ read: 2, skipped: 0, saved: 2, failed: 0, retryLater: 0 });
  });

  test("reports a reservation Domits cannot save on its own, with the fixed error, and confirms the rest", async () => {
    const failing = reservation("msg-2");
    const { reader, sync } = setup({
      reservations: [reservation("msg-1"), failing],
      outcomes: { "msg-2": { failure: RESERVATION_ERROR.ROOM_TYPE_NOT_LINKED } },
    });

    const summary = await sync.run();

    expect(reader.reportFailure).toHaveBeenCalledWith(
      { ...failing, processedAt: NOW_ISO },
      RESERVATION_ERROR.ROOM_TYPE_NOT_LINKED,
      { now: new Date(NOW) }
    );
    expect(reader.confirm.mock.calls[0][0].map((c) => c.messageId)).toEqual(["msg-1"]);
    expect(summary).toMatchObject({ saved: 1, failed: 1 });
  });

  test("leaves a reservation unconfirmed after an unexpected error, so SiteMinder delivers it again", async () => {
    const { reader, logger, sync } = setup({
      reservations: [reservation("msg-1"), reservation("msg-2")],
      outcomes: { "msg-1": Object.assign(new Error("connection reset for guest Ana"), { code: "ECONNRESET" }) },
    });

    const summary = await sync.run();

    expect(reader.confirm.mock.calls[0][0].map((c) => c.messageId)).toEqual(["msg-2"]);
    expect(reader.reportFailure).not.toHaveBeenCalled();
    expect(summary).toMatchObject({ saved: 1, failed: 0, retryLater: 1 });
    expect(logger.warn).toHaveBeenCalledWith(
      JSON.stringify({ event: "SITEMINDER_RESERVATION_RETRY_LATER", messageId: "msg-1", status: "Book", reason: "ECONNRESET" })
    );
  });

  test("counts a failure report that did not reach SiteMinder as one to try again", async () => {
    const { reader, logger, sync } = setup({
      reservations: [reservation("msg-1")],
      outcomes: { "msg-1": { failure: RESERVATION_ERROR.INVALID_RESERVATION } },
    });
    reader.reportFailure.mockRejectedValueOnce(new TypeError("timeout"));

    const summary = await sync.run();

    expect(summary).toMatchObject({ failed: 0, retryLater: 1 });
    expect(logger.warn).toHaveBeenCalledWith(
      JSON.stringify({ event: "SITEMINDER_RESERVATION_RETRY_LATER", messageId: "msg-1", status: "Book", reason: "TypeError" })
    );
  });

  test("sends no confirmation when nothing was saved", async () => {
    const { reader, sync } = setup({ reservations: [] });

    expect(await sync.run()).toEqual({ read: 0, skipped: 0, saved: 0, failed: 0, retryLater: 0 });
    expect(reader.confirm).not.toHaveBeenCalled();
  });

  test("counts the reservations SiteMinder sent without ids", async () => {
    const { sync } = setup({ reservations: [], skipped: 2 });

    expect((await sync.run()).skipped).toBe(2);
  });

  test("logs only the counts of the run, never guest data or the SiteMinder answer", async () => {
    const { logger, sync } = setup({ reservations: [reservation("msg-1")] });

    await sync.run();

    const logged = JSON.stringify([...logger.info.mock.calls, ...logger.warn.mock.calls]);
    expect(logged).not.toMatch(/Ana|Silva|ana@example.com|HOTEL-1|SM-msg-1/);
    expect(logger.info).toHaveBeenCalledWith(
      JSON.stringify({ event: "SITEMINDER_RESERVATIONS_RUN", read: 1, skipped: 0, saved: 1, failed: 0, retryLater: 0 })
    );
  });

  test("fails the run when the confirmation does not reach SiteMinder, so the saved reservations come back", async () => {
    const { reader, sync } = setup({ reservations: [reservation("msg-1")] });
    reader.confirm.mockRejectedValueOnce(new Error("SiteMinder timeout"));

    await expect(sync.run()).rejects.toThrow("SiteMinder timeout");
  });

  test("holds the later messages of a reservation whose earlier message has to wait, so a cancel never overtakes its book", async () => {
    const book = reservation("msg-1");
    const cancel = reservation("msg-2", { status: "Cancel", siteMinderId: "SM-msg-1" });
    const other = reservation("msg-3", { siteMinderId: "SM-other" });
    const { reader, importer, logger, sync } = setup({
      reservations: [book, cancel, other],
      outcomes: { "msg-1": Object.assign(new Error("connection reset"), { code: "ECONNRESET" }) },
    });

    const summary = await sync.run();

    expect(importer.importReservation.mock.calls.map(([r]) => r.messageId)).toEqual(["msg-1", "msg-3"]);
    expect(reader.confirm.mock.calls[0][0].map((c) => c.messageId)).toEqual(["msg-3"]);
    expect(summary).toMatchObject({ read: 3, saved: 1, failed: 0, retryLater: 2 });
    expect(logger.warn).toHaveBeenCalledWith(
      JSON.stringify({ event: "SITEMINDER_RESERVATION_RETRY_LATER", messageId: "msg-2", status: "Cancel", reason: "EARLIER_MESSAGE_PENDING" })
    );
  });

  test("still handles a later message of a reservation whose earlier message was refused to SiteMinder", async () => {
    const { reader, sync } = setup({
      reservations: [reservation("msg-1"), reservation("msg-2", { status: "Modify", siteMinderId: "SM-msg-1" })],
      outcomes: { "msg-1": { failure: RESERVATION_ERROR.ROOM_TYPE_NOT_LINKED } },
    });

    const summary = await sync.run();

    expect(reader.confirm.mock.calls[0][0].map((c) => c.messageId)).toEqual(["msg-2"]);
    expect(summary).toMatchObject({ saved: 1, failed: 1, retryLater: 0 });
  });
});
