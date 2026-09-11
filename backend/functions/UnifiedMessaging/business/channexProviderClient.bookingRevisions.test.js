const ChannexProviderClient = require("../.shared/channelManagement/providers/channex/providerClient.js").default;

const originalFetch = global.fetch;
const CREDENTIALS = { apiKey: "test-api-key" };
const PROPERTY_ID = "ext-property-1";
const REVISION_ID = "revision-1";

const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(body),
});

const revisionRow = (overrides = {}) => ({
  id: REVISION_ID,
  attributes: {
    booking_id: "booking-1",
    property_id: PROPERTY_ID,
    unique_id: "unique-1",
    system_id: "system-1",
    ota_reservation_code: "OTA-123",
    ota_name: "Booking.com",
    status: "new",
    arrival_date: "2026-06-01",
    departure_date: "2026-06-04",
    arrival_hour: "15:00",
    amount: "450.00",
    currency: "EUR",
    inserted_at: "2026-05-20T10:00:00Z",
    customer: { name: "Ada Lovelace" },
    rooms: [{ room_type_id: "ext-room-1", rate_plan_id: "ext-rate-1" }],
    ...overrides,
  },
});

const REVISION_METHODS = [
  {
    method: "listBookingRevisionFeed",
    call: (client) => client.listBookingRevisionFeed(CREDENTIALS, { externalPropertyId: PROPERTY_ID }),
    callWithoutKey: (client) => client.listBookingRevisionFeed({}, { externalPropertyId: PROPERTY_ID }),
    callWithoutId: (client) => client.listBookingRevisionFeed(CREDENTIALS, {}),
    missingIdCode: "MISSING_PROPERTY_ID",
    fallbackStatus: "BOOKING_FEED_FAILED",
    errorCodePrefix: "CHANNEX_BOOKING_FEED",
  },
  {
    method: "getBookingRevision",
    call: (client) => client.getBookingRevision(CREDENTIALS, REVISION_ID),
    callWithoutKey: (client) => client.getBookingRevision({}, REVISION_ID),
    callWithoutId: (client) => client.getBookingRevision(CREDENTIALS, ""),
    missingIdCode: "MISSING_BOOKING_REVISION_ID",
    fallbackStatus: "BOOKING_REVISION_GET_FAILED",
    errorCodePrefix: "CHANNEX_BOOKING_REVISION",
  },
  {
    method: "acknowledgeBookingRevision",
    call: (client) => client.acknowledgeBookingRevision(CREDENTIALS, REVISION_ID),
    callWithoutKey: (client) => client.acknowledgeBookingRevision({}, REVISION_ID),
    callWithoutId: (client) => client.acknowledgeBookingRevision(CREDENTIALS, ""),
    missingIdCode: "MISSING_BOOKING_REVISION_ID",
    fallbackStatus: "BOOKING_REVISION_ACK_FAILED",
    errorCodePrefix: "CHANNEX_BOOKING_ACK",
  },
];

describe("ChannexProviderClient booking revisions", () => {
  let client;

  beforeEach(() => {
    client = new ChannexProviderClient();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("missing apiKey short-circuits before any request", () => {
    it.each(REVISION_METHODS)(
      "$method returns INVALID_CREDENTIALS without calling fetch",
      async ({ callWithoutKey }) => {
        const result = await callWithoutKey(client);

        expect(global.fetch).not.toHaveBeenCalled();
        expect(result).toMatchObject({
          success: false,
          providerStatus: "INVALID_CREDENTIALS",
          errorCode: "MISSING_API_KEY",
        });
      }
    );
  });

  describe("missing required identifier short-circuits before any request", () => {
    it.each(REVISION_METHODS)(
      "$method returns INVALID_REQUEST without calling fetch",
      async ({ callWithoutId, missingIdCode }) => {
        const result = await callWithoutId(client);

        expect(global.fetch).not.toHaveBeenCalled();
        expect(result).toMatchObject({
          success: false,
          providerStatus: "INVALID_REQUEST",
          errorCode: missingIdCode,
        });
      }
    );
  });

  // These three map 401 with an inline ternary rather than the getProviderStatusForHttpStatus
  // helper the discovery reads use, so the branch needs its own coverage.
  describe("401 responses map to UNAUTHORIZED", () => {
    it.each(REVISION_METHODS)("$method reports UNAUTHORIZED", async ({ call, errorCodePrefix }) => {
      global.fetch.mockResolvedValue(jsonResponse(401, {}));

      const result = await call(client);

      expect(result).toMatchObject({
        success: false,
        providerStatus: "UNAUTHORIZED",
        errorCode: `${errorCodePrefix}_401`,
      });
    });
  });

  describe("other non-2xx responses map to the method fallback status", () => {
    it.each(REVISION_METHODS)(
      "$method reports $fallbackStatus on 500",
      async ({ call, fallbackStatus, errorCodePrefix }) => {
        global.fetch.mockResolvedValue(jsonResponse(500, {}));

        const result = await call(client);

        expect(result).toMatchObject({
          success: false,
          providerStatus: fallbackStatus,
          errorCode: `${errorCodePrefix}_500`,
        });
      }
    );

    test("a Channex-provided error code and title take priority over the fallback template", async () => {
      global.fetch.mockResolvedValue(
        jsonResponse(422, { errors: { code: "REVISION_ALREADY_ACKED", title: "Revision was already acknowledged." } })
      );

      const result = await client.acknowledgeBookingRevision(CREDENTIALS, REVISION_ID);

      expect(result).toMatchObject({
        errorCode: "REVISION_ALREADY_ACKED",
        errorMessage: "Revision was already acknowledged.",
      });
    });
  });

  // errorCode falls through error?.code || error?.name, and a standard Error's name wins before
  // the method-specific request-failed constant is reached (same chain quirk covered in Slice 1).
  describe("request rejections map to the method fallback status", () => {
    it.each(REVISION_METHODS)(
      "$method reports $fallbackStatus when fetch rejects",
      async ({ call, fallbackStatus }) => {
        global.fetch.mockRejectedValue(new Error("socket hang up"));

        const result = await call(client);

        expect(result).toMatchObject({
          success: false,
          providerStatus: fallbackStatus,
          errorCode: "Error",
          errorMessage: "socket hang up",
        });
      }
    );
  });

  describe("listBookingRevisionFeed", () => {
    test("requests the feed filtered by property and ordered by insertion time", async () => {
      global.fetch.mockResolvedValue(jsonResponse(200, { data: [] }));

      await client.listBookingRevisionFeed(CREDENTIALS, { externalPropertyId: PROPERTY_ID });

      const [url, init] = global.fetch.mock.calls[0];
      expect(url.toString()).toBe(
        "https://staging.channex.io/api/v1/booking_revisions/feed?filter%5Bproperty_id%5D=ext-property-1&order%5Binserted_at%5D=asc"
      );
      expect(init.method).toBe("GET");
      expect(init.headers).toMatchObject({
        "user-api-key": "test-api-key",
        "Content-Type": "application/json",
      });
    });

    test("maps a revision row onto the normalized shape", async () => {
      const row = revisionRow();
      global.fetch.mockResolvedValue(jsonResponse(200, { data: [row] }));

      const result = await client.listBookingRevisionFeed(CREDENTIALS, { externalPropertyId: PROPERTY_ID });

      expect(result.success).toBe(true);
      expect(result.providerStatus).toBe("ACTIVE");
      expect(result.revisions[0]).toEqual({
        revisionId: REVISION_ID,
        bookingId: "booking-1",
        propertyId: PROPERTY_ID,
        uniqueId: "unique-1",
        systemId: "system-1",
        otaReservationCode: "OTA-123",
        otaName: "Booking.com",
        status: "new",
        arrivalDate: "2026-06-01",
        departureDate: "2026-06-04",
        arrivalHour: "15:00",
        amount: "450.00",
        currency: "EUR",
        insertedAt: "2026-05-20T10:00:00Z",
        guestName: "Ada Lovelace",
        rooms: [{ roomTypeId: "ext-room-1", ratePlanId: "ext-rate-1" }],
        ratePlanId: "ext-rate-1",
        roomTypeId: "ext-room-1",
        rawPayload: row,
      });
    });

    // A revision without a rooms array (a cancellation, for instance) still maps, but the room
    // and rate plan ids derived from the first room come back null - the fields the downstream
    // booking import keys off, so the null outcome is worth stating explicitly.
    test("maps a revision that carries no rooms to null room and rate plan ids", async () => {
      global.fetch.mockResolvedValue(jsonResponse(200, { data: [revisionRow({ rooms: undefined })] }));

      const result = await client.listBookingRevisionFeed(CREDENTIALS, { externalPropertyId: PROPERTY_ID });

      expect(result.revisions[0]).toMatchObject({
        revisionId: REVISION_ID,
        rooms: [],
        ratePlanId: null,
        roomTypeId: null,
      });
    });

    test("drops rows that carry no revision id", async () => {
      global.fetch.mockResolvedValue(
        jsonResponse(200, { data: [revisionRow(), { attributes: { booking_id: "booking-2" } }] })
      );

      const result = await client.listBookingRevisionFeed(CREDENTIALS, { externalPropertyId: PROPERTY_ID });

      expect(result.revisions).toHaveLength(1);
      expect(result.revisions[0].revisionId).toBe(REVISION_ID);
    });

    // Unlike the discovery reads, which return INVALID_RESPONSE for an unusable body, the feed
    // silently degrades to an empty revision list and still reports success.
    test("reports success with no revisions when the feed body is malformed", async () => {
      global.fetch.mockResolvedValue(jsonResponse(200, { unexpected: "shape" }));

      const result = await client.listBookingRevisionFeed(CREDENTIALS, { externalPropertyId: PROPERTY_ID });

      expect(result).toMatchObject({
        success: true,
        revisions: [],
        providerStatus: "ACTIVE",
        errorCode: null,
      });
    });

    describe("guest name resolution", () => {
      it.each([
        {
          description: "uses customer.name when present",
          customer: { name: "Ada Lovelace" },
          expected: "Ada Lovelace",
        },
        {
          description: "joins first and last name when name is absent",
          customer: { first_name: "Ada", last_name: "Lovelace" },
          expected: "Ada Lovelace",
        },
        { description: "uses first name alone", customer: { first_name: "Ada" }, expected: "Ada" },
        { description: "is null when no name parts exist", customer: {}, expected: null },
      ])("$description", async ({ customer, expected }) => {
        global.fetch.mockResolvedValue(jsonResponse(200, { data: [revisionRow({ customer })] }));

        const result = await client.listBookingRevisionFeed(CREDENTIALS, { externalPropertyId: PROPERTY_ID });

        expect(result.revisions[0].guestName).toBe(expected);
      });
    });
  });

  describe("getBookingRevision", () => {
    test("requests the revision by id without query parameters", async () => {
      global.fetch.mockResolvedValue(jsonResponse(200, { data: revisionRow() }));

      await client.getBookingRevision(CREDENTIALS, REVISION_ID);

      const [url, init] = global.fetch.mock.calls[0];
      expect(url.toString()).toBe("https://staging.channex.io/api/v1/booking_revisions/revision-1");
      expect(init.method).toBe("GET");
      expect(init.headers).toMatchObject({ "user-api-key": "test-api-key" });
    });

    test("returns the normalized revision on success", async () => {
      global.fetch.mockResolvedValue(jsonResponse(200, { data: revisionRow() }));

      const result = await client.getBookingRevision(CREDENTIALS, REVISION_ID);

      expect(result).toMatchObject({ success: true, providerStatus: "ACTIVE", errorCode: null });
      expect(result.revision).toMatchObject({ revisionId: REVISION_ID, bookingId: "booking-1" });
    });

    it.each([
      { description: "data is null", data: null },
      // typeof [] === "object" clears the guard, but the mapper finds no id on an array, so the
      // empty-revision branch catches it instead.
      { description: "data is an array", data: [] },
    ])("returns INVALID_RESPONSE when $description", async ({ data }) => {
      global.fetch.mockResolvedValue(jsonResponse(200, { data }));

      const result = await client.getBookingRevision(CREDENTIALS, REVISION_ID);

      expect(result).toMatchObject({
        success: false,
        revision: null,
        providerStatus: "INVALID_RESPONSE",
        errorCode: "CHANNEX_BOOKING_REVISION_INVALID_RESPONSE",
      });
    });
  });

  describe("acknowledgeBookingRevision", () => {
    test("posts to the ack path without a request body", async () => {
      global.fetch.mockResolvedValue(jsonResponse(200, {}));

      await client.acknowledgeBookingRevision(CREDENTIALS, REVISION_ID);

      const [url, init] = global.fetch.mock.calls[0];
      expect(url.toString()).toBe("https://staging.channex.io/api/v1/booking_revisions/revision-1/ack");
      expect(init.method).toBe("POST");
      expect(init.body).toBeUndefined();
      expect(init.headers).toMatchObject({ "user-api-key": "test-api-key" });
    });

    test("reports ACKNOWLEDGED and echoes the revision id", async () => {
      global.fetch.mockResolvedValue(jsonResponse(200, {}));

      const result = await client.acknowledgeBookingRevision(CREDENTIALS, REVISION_ID);

      expect(result).toEqual({
        success: true,
        revisionId: REVISION_ID,
        providerStatus: "ACKNOWLEDGED",
        errorCode: null,
        errorMessage: null,
      });
    });

    test("echoes the revision id when only the api key is missing", async () => {
      const result = await client.acknowledgeBookingRevision({}, REVISION_ID);

      expect(result).toMatchObject({ providerStatus: "INVALID_CREDENTIALS", revisionId: REVISION_ID });
    });

    test("returns a null revision id when the revision id itself is missing", async () => {
      const result = await client.acknowledgeBookingRevision(CREDENTIALS, "");

      expect(result).toMatchObject({ providerStatus: "INVALID_REQUEST", revisionId: null });
    });
  });
});
