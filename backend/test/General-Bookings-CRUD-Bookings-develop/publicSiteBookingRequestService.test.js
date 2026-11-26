import { inspect } from "node:util";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import PublicSiteBookingRequestService from "../../functions/General-Bookings-CRUD-Bookings-develop/business/publicSiteBookingRequestService.js";
import { PublicBookingRequestError } from "../../functions/General-Bookings-CRUD-Bookings-develop/util/exception/PublicBookingRequestError.js";
import ConflictException from "../../functions/General-Bookings-CRUD-Bookings-develop/util/exception/ConflictException.js";
import { parseBookingDateToMs } from "../../functions/General-Bookings-CRUD-Bookings-develop/util/bookingDateParser.js";
import { signWebsiteQuoteToken } from "../../functions/.shared/websiteQuoteToken.js";

const SECRET = "quote-secret";
const NOW = Date.parse("2026-09-07T10:00:00.000Z");
const THIRTY_MINUTES_MS = 30 * 60 * 1000;
const SITE = { id: "site-1", propertyId: "property-1", hostId: "host-1", status: "PUBLISHED" };
const PRICE_BREAKDOWN = {
  currency: "EUR",
  nightlyBaseTotal: 76000,
  cleaningFee: 5000,
  discounts: [],
  taxes: [],
  fees: [],
  total: 81000,
};
const TOKEN_PAYLOAD = {
  v: 1,
  quoteId: "quote_1",
  siteId: "site-1",
  propertyId: "property-1",
  checkIn: "2026-10-01",
  checkOut: "2026-10-05",
  guests: 2,
  priceBreakdown: PRICE_BREAKDOWN,
  expiresAt: new Date(NOW + THIRTY_MINUTES_MS).toISOString(),
};
const QUOTE_TOKEN = signWebsiteQuoteToken(TOKEN_PAYLOAD, SECRET);
const FRESH_QUOTE = { ...TOKEN_PAYLOAD, quoteId: "quote_2", quoteToken: "qtok_fresh" };
const ARRIVAL_MS = parseBookingDateToMs("2026-10-01", "checkIn");
const DEPARTURE_MS = parseBookingDateToMs("2026-10-05", "checkOut");
const EXISTING_ROW = {
  id: "booking-existing",
  site_id: "site-1",
  property_id: "property-1",
  arrivaldate: ARRIVAL_MS,
  departuredate: DEPARTURE_MS,
  guests: 2,
  total_price: 810,
  total_price_minor: "81000",
  public_booking_ref: "DBW-EXISTINGAA",
  status: "Inquiry",
  idempotency_key: "idem-1",
};

const REQUEST = {
  siteId: "site-1",
  idempotencyKey: "idem-1",
  quoteToken: QUOTE_TOKEN,
  guest: { name: "Guest Name", email: "guest@example.com" },
  session: { sessionId: "visitor-1" },
  requestId: "req-1",
};

const uniqueViolation = (constraint) => Object.assign(new Error("duplicate key"), { code: "23505", constraint });

const buildDeps = (overrides = {}) => ({
  standaloneSiteRepository: { getSiteById: jest.fn().mockResolvedValue(SITE) },
  reservationRepository: {
    getByIdempotencyKey: jest.fn().mockResolvedValue(null),
    createPublicSiteBookingRequest: jest.fn().mockImplementation(async (values) => values),
    assertNoBookingConflict: jest.fn().mockResolvedValue(true),
  },
  propertyRepository: {
    assertBookingDatesAvailable: jest.fn().mockResolvedValue(true),
    getCancellationPolicyByPropertyId: jest.fn().mockResolvedValue("flexible"),
    getPropertyById: jest.fn().mockResolvedValue({ id: "property-1", title: "Sea View Loft" }),
  },
  externalCalendarService: { ensureNoExternalConflict: jest.fn().mockResolvedValue(undefined) },
  quoteRevalidationClient: { requoteSite: jest.fn().mockResolvedValue({ ok: true, quote: FRESH_QUOTE }) },
  standaloneSiteEventRepository: { recordEvent: jest.fn().mockResolvedValue(undefined) },
  systemManagerRepository: { getSystemManagerParameter: jest.fn().mockResolvedValue(SECRET) },
  getHostContactById: jest.fn().mockResolvedValue({ email: "host@example.com", name: "Host Name" }),
  sendBookingRequestEmails: jest.fn().mockResolvedValue(undefined),
  generatePublicBookingRef: jest.fn().mockReturnValue("DBW-ABCDEFGHJK"),
  clock: () => NOW,
  ...overrides,
});

const buildService = (overrides = {}) => {
  const deps = buildDeps(overrides);
  return { service: new PublicSiteBookingRequestService(deps), deps };
};

const expectError = async (promise, code) => {
  await expect(promise).rejects.toBeInstanceOf(PublicBookingRequestError);
  await expect(promise).rejects.toMatchObject({ code });
};

describe("PublicSiteBookingRequestService.createBookingRequest", () => {
  it("creates an Inquiry booking attributed to the direct booking website and returns the public reference", async () => {
    const { service, deps } = buildService();

    const result = await service.createBookingRequest(REQUEST);

    expect(result).toEqual({
      statusCode: 201,
      response: {
        publicBookingRef: "DBW-ABCDEFGHJK",
        status: "REQUESTED",
        siteId: "site-1",
        checkIn: "2026-10-01",
        checkOut: "2026-10-05",
        guests: 2,
        total: 81000,
        currency: "EUR",
      },
    });
    expect(deps.reservationRepository.createPublicSiteBookingRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "Inquiry",
        booking_source: "STANDALONE_SITE",
        bookingtype: "inquiry",
        site_id: "site-1",
        property_id: "property-1",
        hostid: "host-1",
        hostname: "Host Name",
        guestname: "Guest Name",
        guest_email: "guest@example.com",
        guests: 2,
        arrivaldate: ARRIVAL_MS,
        departuredate: DEPARTURE_MS,
        total_price: 810,
        total_price_minor: "81000",
        cancellation_policy: "flexible",
        paymentid: "FAILED: ",
        latepayment: false,
        idempotency_key: "idem-1",
        public_booking_ref: "DBW-ABCDEFGHJK",
        guestid: expect.stringMatching(/^dbw-[0-9a-f-]{36}$/),
      })
    );
  });

  it("re-quotes through PropertyHandler with the token's stay, never the client's", async () => {
    const { service, deps } = buildService();

    await service.createBookingRequest(REQUEST);

    expect(deps.quoteRevalidationClient.requoteSite).toHaveBeenCalledWith({
      siteId: "site-1",
      checkIn: "2026-10-01",
      checkOut: "2026-10-05",
      guests: 2,
      sessionId: "visitor-1",
      requestId: "req-1",
    });
  });

  it("runs the write-time guards with the token's dates before inserting", async () => {
    const { service, deps } = buildService();

    await service.createBookingRequest(REQUEST);

    expect(deps.propertyRepository.assertBookingDatesAvailable).toHaveBeenCalledWith({
      propertyId: "property-1",
      arrivalDateMs: ARRIVAL_MS,
      departureDateMs: DEPARTURE_MS,
    });
    expect(deps.reservationRepository.assertNoBookingConflict).toHaveBeenCalledWith({
      propertyId: "property-1",
      arrivalDateMs: ARRIVAL_MS,
      departureDateMs: DEPARTURE_MS,
    });
    expect(deps.externalCalendarService.ensureNoExternalConflict).toHaveBeenCalledWith({
      propertyId: "property-1",
      arrivalMs: ARRIVAL_MS,
      departureMs: DEPARTURE_MS,
    });
  });

  it("records a SITE_BOOKING_REQUESTED event and sends both emails after the insert", async () => {
    const { service, deps } = buildService();

    await service.createBookingRequest(REQUEST);

    expect(deps.standaloneSiteEventRepository.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyId: "property-1",
        hostId: "host-1",
        eventType: "SITE_BOOKING_REQUESTED",
        payload: expect.objectContaining({
          requestId: "req-1",
          siteId: "site-1",
          quoteId: "quote_1",
          publicBookingRef: "DBW-ABCDEFGHJK",
          sessionId: "visitor-1",
        }),
      })
    );
    expect(deps.sendBookingRequestEmails).toHaveBeenCalledWith(
      expect.objectContaining({
        hostEmail: "host@example.com",
        guestEmail: "guest@example.com",
        bookingInfo: expect.objectContaining({
          publicBookingRef: "DBW-ABCDEFGHJK",
          propertyName: "Sea View Loft",
          guestName: "Guest Name",
          guestEmail: "guest@example.com",
          guests: 2,
          checkIn: "2026-10-01",
          checkOut: "2026-10-05",
        }),
      })
    );
    const insertOrder = deps.reservationRepository.createPublicSiteBookingRequest.mock.invocationCallOrder[0];
    expect(deps.sendBookingRequestEmails.mock.invocationCallOrder[0]).toBeGreaterThan(insertOrder);
    expect(deps.standaloneSiteEventRepository.recordEvent.mock.invocationCallOrder[0]).toBeGreaterThan(insertOrder);
  });

  it("still returns 201 when emails or event recording fail", async () => {
    const { service } = buildService({
      sendBookingRequestEmails: jest.fn().mockRejectedValue(new Error("mail down")),
      standaloneSiteEventRepository: { recordEvent: jest.fn().mockRejectedValue(new Error("event store down")) },
    });

    await expect(service.createBookingRequest(REQUEST)).resolves.toMatchObject({ statusCode: 201 });
  });

  it("falls back to the WIP-Host sentinel and skips the host email when the host lookup fails", async () => {
    const { service, deps } = buildService({ getHostContactById: jest.fn().mockRejectedValue(new Error("no user")) });

    await expect(service.createBookingRequest(REQUEST)).resolves.toMatchObject({ statusCode: 201 });

    expect(deps.reservationRepository.createPublicSiteBookingRequest).toHaveBeenCalledWith(
      expect.objectContaining({ hostname: "WIP-Host" })
    );
    expect(deps.sendBookingRequestEmails).toHaveBeenCalledWith(expect.objectContaining({ hostEmail: null }));
  });

  describe("idempotency", () => {
    it("replays the original response for a known key without re-quoting or inserting", async () => {
      const { service, deps } = buildService({
        reservationRepository: {
          getByIdempotencyKey: jest.fn().mockResolvedValue(EXISTING_ROW),
          createPublicSiteBookingRequest: jest.fn(),
          assertNoBookingConflict: jest.fn(),
        },
      });

      const result = await service.createBookingRequest(REQUEST);

      expect(result).toEqual({
        statusCode: 201,
        response: {
          publicBookingRef: "DBW-EXISTINGAA",
          status: "REQUESTED",
          siteId: "site-1",
          checkIn: "2026-10-01",
          checkOut: "2026-10-05",
          guests: 2,
          total: 81000,
          currency: "EUR",
        },
      });
      expect(deps.quoteRevalidationClient.requoteSite).not.toHaveBeenCalled();
      expect(deps.reservationRepository.createPublicSiteBookingRequest).not.toHaveBeenCalled();
    });

    it("rejects a key reused for a different stay as idempotency_key_reused", async () => {
      const { service } = buildService({
        reservationRepository: {
          getByIdempotencyKey: jest.fn().mockResolvedValue({ ...EXISTING_ROW, guests: 3 }),
          createPublicSiteBookingRequest: jest.fn(),
          assertNoBookingConflict: jest.fn(),
        },
      });

      await expectError(service.createBookingRequest(REQUEST), "idempotency_key_reused");
    });

    it("rejects a key used for another property of the site as idempotency_key_reused", async () => {
      const { service, deps } = buildService({
        reservationRepository: {
          getByIdempotencyKey: jest.fn().mockResolvedValue({ ...EXISTING_ROW, property_id: "property-2" }),
          createPublicSiteBookingRequest: jest.fn(),
          assertNoBookingConflict: jest.fn(),
        },
      });

      await expectError(service.createBookingRequest(REQUEST), "idempotency_key_reused");
      expect(deps.reservationRepository.createPublicSiteBookingRequest).not.toHaveBeenCalled();
    });

    it("replays when a concurrent request wins the insert race on the same key", async () => {
      const { service, deps } = buildService({
        reservationRepository: {
          getByIdempotencyKey: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(EXISTING_ROW),
          createPublicSiteBookingRequest: jest.fn().mockRejectedValue(uniqueViolation("booking_idempotency_key_unique")),
          assertNoBookingConflict: jest.fn().mockResolvedValue(true),
        },
      });

      const result = await service.createBookingRequest(REQUEST);

      expect(result.response.publicBookingRef).toBe("DBW-EXISTINGAA");
      expect(deps.reservationRepository.getByIdempotencyKey).toHaveBeenCalledTimes(2);
    });

    it("regenerates the public reference once when it collides", async () => {
      const { service, deps } = buildService({
        reservationRepository: {
          getByIdempotencyKey: jest.fn().mockResolvedValue(null),
          createPublicSiteBookingRequest: jest
            .fn()
            .mockRejectedValueOnce(uniqueViolation("booking_public_booking_ref_unique"))
            .mockImplementation(async (values) => values),
          assertNoBookingConflict: jest.fn().mockResolvedValue(true),
        },
        generatePublicBookingRef: jest.fn().mockReturnValueOnce("DBW-AAAAAAAAAA").mockReturnValueOnce("DBW-BBBBBBBBBB"),
      });

      const result = await service.createBookingRequest(REQUEST);

      expect(result.response.publicBookingRef).toBe("DBW-BBBBBBBBBB");
      expect(deps.reservationRepository.createPublicSiteBookingRequest).toHaveBeenCalledTimes(2);
    });

    it.each([
      ["missing", undefined, "missing_idempotency_key"],
      ["blank", "   ", "missing_idempotency_key"],
      ["too long", "k".repeat(256), "invalid_idempotency_key"],
    ])("rejects a %s idempotency key before touching any repository", async (_label, idempotencyKey, code) => {
      const { service, deps } = buildService();

      await expectError(service.createBookingRequest({ ...REQUEST, idempotencyKey }), code);
      expect(deps.standaloneSiteRepository.getSiteById).not.toHaveBeenCalled();
      expect(deps.reservationRepository.getByIdempotencyKey).not.toHaveBeenCalled();
    });
  });

  describe("token and site checks", () => {
    it("rejects a token signed with another secret as quote_expired", async () => {
      const { service } = buildService({
        systemManagerRepository: { getSystemManagerParameter: jest.fn().mockResolvedValue("other-secret") },
      });
      await expectError(service.createBookingRequest(REQUEST), "quote_expired");
    });

    it("rejects an expired token as quote_expired", async () => {
      const { service } = buildService({ clock: () => NOW + THIRTY_MINUTES_MS + 1 });
      await expectError(service.createBookingRequest(REQUEST), "quote_expired");
    });

    it("rejects a token issued for another site as quote_token_invalid", async () => {
      const { service } = buildService();
      await expectError(service.createBookingRequest({ ...REQUEST, siteId: "site-2" }), "quote_token_invalid");
    });

    it("re-quotes a token for another property of the site with that property, and refuses it when the quote does", async () => {
      const { service, deps } = buildService({
        standaloneSiteRepository: { getSiteById: jest.fn().mockResolvedValue({ ...SITE, propertyId: "property-9" }) },
        quoteRevalidationClient: {
          requoteSite: jest.fn().mockResolvedValue({ ok: false, status: 404, code: "property_not_found", message: "" }),
        },
      });

      const promise = service.createBookingRequest(REQUEST);

      await expect(promise).rejects.toMatchObject({
        code: "property_not_found",
        statusCode: 404,
        message: "This property can no longer be booked on this website.",
      });
      expect(deps.quoteRevalidationClient.requoteSite).toHaveBeenCalledWith(
        expect.objectContaining({ siteId: "site-1", propertyId: "property-1" })
      );
      expect(deps.reservationRepository.createPublicSiteBookingRequest).not.toHaveBeenCalled();
    });

    it.each([
      ["no property", { propertyId: undefined }],
      ["an empty property", { propertyId: "  " }],
    ])("rejects a token with %s as quote_token_invalid before reading the site", async (_label, change) => {
      const { service, deps } = buildService();
      const quoteToken = signWebsiteQuoteToken({ ...TOKEN_PAYLOAD, ...change }, SECRET);

      await expectError(service.createBookingRequest({ ...REQUEST, quoteToken }), "quote_token_invalid");
      expect(deps.standaloneSiteRepository.getSiteById).not.toHaveBeenCalled();
    });

    it.each([
      ["missing", null, "site_not_found"],
      ["suspended", { ...SITE, status: "SUSPENDED" }, "site_suspended"],
      ["unpublished", { ...SITE, status: "PREVIEW" }, "site_not_published"],
    ])("rejects a %s site", async (_label, site, code) => {
      const { service, deps } = buildService({
        standaloneSiteRepository: { getSiteById: jest.fn().mockResolvedValue(site) },
      });
      await expectError(service.createBookingRequest(REQUEST), code);
      expect(deps.reservationRepository.createPublicSiteBookingRequest).not.toHaveBeenCalled();
    });
  });

  describe("revalidation", () => {
    it("passes a quote endpoint rejection through with its code", async () => {
      const { service } = buildService({
        quoteRevalidationClient: {
          requoteSite: jest.fn().mockResolvedValue({ ok: false, status: 409, code: "unavailable_dates", message: "Taken." }),
        },
      });
      const promise = service.createBookingRequest(REQUEST);
      await expectError(promise, "unavailable_dates");
      await expect(promise).rejects.toMatchObject({ message: "Taken." });
    });

    it("rejects a changed price as quote_expired", async () => {
      const { service, deps } = buildService({
        quoteRevalidationClient: {
          requoteSite: jest.fn().mockResolvedValue({
            ok: true,
            quote: { ...FRESH_QUOTE, priceBreakdown: { ...PRICE_BREAKDOWN, total: 90000 } },
          }),
        },
      });
      await expectError(service.createBookingRequest(REQUEST), "quote_expired");
      expect(deps.reservationRepository.createPublicSiteBookingRequest).not.toHaveBeenCalled();
    });

    it("maps a write-time guard conflict to unavailable_dates", async () => {
      const { service } = buildService({
        reservationRepository: {
          getByIdempotencyKey: jest.fn().mockResolvedValue(null),
          createPublicSiteBookingRequest: jest.fn(),
          assertNoBookingConflict: jest.fn().mockRejectedValue(new ConflictException("Selected dates are not available.")),
        },
      });
      await expectError(service.createBookingRequest(REQUEST), "unavailable_dates");
    });

    it("maps a repository failure to booking_service_unavailable", async () => {
      const { service } = buildService({
        standaloneSiteRepository: { getSiteById: jest.fn().mockRejectedValue(new Error("connection reset")) },
      });
      await expectError(service.createBookingRequest(REQUEST), "booking_service_unavailable");
    });
  });

  describe("phone and message", () => {
    const PHONE = "+31 (0)6 12.34-56 78";
    const withNote = (guest, message) => ({ ...REQUEST, guest: { ...REQUEST.guest, ...guest }, message });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("gives the phone and message only to the host email, and keeps them out of the row, the event and the logs", async () => {
      const consoleCalls = [jest.spyOn(console, "error"), jest.spyOn(console, "log")].map((spy) =>
        spy.mockImplementation(() => undefined)
      );
      const { service, deps } = buildService({
        sendBookingRequestEmails: jest.fn().mockRejectedValue(new Error("mail down")),
      });

      await service.createBookingRequest(withNote({ phone: ` ${PHONE} ` }, "We arrive\r\nafter 22:00."));

      const [emailInput] = deps.sendBookingRequestEmails.mock.calls[0];
      expect(emailInput.hostNote).toEqual({ phone: PHONE, message: "We arrive\nafter 22:00." });
      const elsewhere = JSON.stringify([
        emailInput.bookingInfo,
        deps.reservationRepository.createPublicSiteBookingRequest.mock.calls,
        deps.standaloneSiteEventRepository.recordEvent.mock.calls,
        consoleCalls.map((spy) => spy.mock.calls.map((args) => args.map((arg) => inspect(arg, { depth: 10 })))),
      ]);
      expect(consoleCalls[0]).toHaveBeenCalled();
      expect(elsewhere).not.toMatch(/12\.34|22:00/);
    });

    it.each([
      ["absent", undefined, undefined, { phone: null, message: null }],
      ["null", null, null, { phone: null, message: null }],
      ["only spaces", "   ", " \n\t ", { phone: null, message: null }],
      ["at the limits", "123456", "m".repeat(2000), { phone: "123456", message: "m".repeat(2000) }],
      ["with 15 digits", "+123 456 789 012 345", "a", { phone: "+123 456 789 012 345", message: "a" }],
      [
        "of 32 characters",
        `+31 6 ${"- ".repeat(9)}12345678`,
        "a",
        { phone: `+31 6 ${"- ".repeat(9)}12345678`, message: "a" },
      ],
      ["with old line breaks and tabs", undefined, "a\rb\r\n\tc", { phone: null, message: "a\nb\n c" }],
      ["with many empty lines", undefined, "a\n\n\n\n\nb", { phone: null, message: "a\n\nb" }],
      [
        "with control and direction characters",
        undefined,
        "a\u0000\u0007b\u202Ec\u2028d\uFEFF",
        { phone: null, message: "abc\nd" },
      ],
      [
        "with HTML and header lines",
        undefined,
        "<script>x</script>\nSubject: hi",
        { phone: null, message: "<script>x</script>\nSubject: hi" },
      ],
    ])("accepts a phone and message %s", async (_label, phone, message, hostNote) => {
      const { service, deps } = buildService();

      await expect(service.createBookingRequest(withNote({ phone }, message))).resolves.toMatchObject({
        statusCode: 201,
      });

      expect(deps.sendBookingRequestEmails.mock.calls[0][0].hostNote).toEqual(hostNote);
    });

    it.each([
      ["a phone with a line break", { phone: "+31 6 1234\nBcc: x@example.com" }, undefined, "invalid_guest_phone"],
      ["a phone with letters", { phone: "call me 123456" }, undefined, "invalid_guest_phone"],
      ["a phone with a + inside", { phone: "31+612345678" }, undefined, "invalid_guest_phone"],
      ["a phone with 5 digits", { phone: "12-345" }, undefined, "invalid_guest_phone"],
      ["a phone with 16 digits", { phone: "1234567890123456" }, undefined, "invalid_guest_phone"],
      ["a phone of 33 characters", { phone: `+31 6 ${"- ".repeat(9)}123456789` }, undefined, "invalid_guest_phone"],
      ["a phone that is a number", { phone: 31612345678 }, undefined, "invalid_guest_phone"],
      ["a message of 2001 characters", {}, "m".repeat(2001), "invalid_guest_message"],
      ["a very long message", {}, "m".repeat(1_000_000), "invalid_guest_message"],
      ["a message that is not text", {}, { text: "hi" }, "invalid_guest_message"],
    ])("refuses %s with a 400 before reading anything", async (_label, guest, message, code) => {
      const { service, deps } = buildService();

      const promise = service.createBookingRequest(withNote(guest, message));

      await expect(promise).rejects.toMatchObject({ code, statusCode: 400 });
      await expect(promise).rejects.toThrow(
        code === "invalid_guest_phone" ? /phone number of 6 to 15 digits/ : /at most 2000 characters/
      );
      expect(deps.systemManagerRepository.getSystemManagerParameter).not.toHaveBeenCalled();
      expect(deps.standaloneSiteRepository.getSiteById).not.toHaveBeenCalled();
    });
  });

  describe("guest contact", () => {
    it.each([
      ["missing name", { name: "", email: "guest@example.com" }],
      ["missing email", { name: "Guest", email: "" }],
      ["malformed email", { name: "Guest", email: "not-an-email" }],
    ])("rejects %s as invalid_guest_contact", async (_label, guest) => {
      const { service } = buildService();
      await expectError(service.createBookingRequest({ ...REQUEST, guest }), "invalid_guest_contact");
    });
  });
});
