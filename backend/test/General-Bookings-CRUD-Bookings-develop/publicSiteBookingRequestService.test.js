import { describe, expect, it, jest } from "@jest/globals";
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
  arrivaldate: ARRIVAL_MS,
  departuredate: DEPARTURE_MS,
  guests: 2,
  total_price: 810,
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

    it("rejects a token whose property does not match the site as quote_token_invalid", async () => {
      const { service } = buildService({
        standaloneSiteRepository: { getSiteById: jest.fn().mockResolvedValue({ ...SITE, propertyId: "property-9" }) },
      });
      await expectError(service.createBookingRequest(REQUEST), "quote_token_invalid");
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
