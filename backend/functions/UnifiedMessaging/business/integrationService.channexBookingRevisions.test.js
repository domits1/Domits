jest.mock(
  "@aws-sdk/client-secrets-manager",
  () => require("./integrationService.secretsManagerMock.js"),
  { virtual: true }
);

jest.mock("../ORM/index.js", () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(),
  },
}));

const IntegrationService = require("./integrationService.js").default;

const buildRevisionRow = (overrides = {}) => ({
  id: "local-revision-1",
  integrationAccountId: "integration-account-1",
  domitsPropertyId: "domits-property-1",
  externalPropertyId: "external-property-1",
  externalReservationId: "booking-1",
  revisionId: "revision-1",
  bookingStatus: "new",
  arrivalDate: "2026-05-01",
  departureDate: "2026-05-05",
  guestSummary: "Guest Example",
  rawPayload: JSON.stringify({ provider: "CHANNEX", payload: { id: "revision-1" } }),
  acknowledgementState: "RECEIVED",
  acknowledgedAt: null,
  createdAt: 1770000000000,
  updatedAt: 1770000001000,
  ...overrides,
});

const buildFeedRevision = (overrides = {}) => ({
  revisionId: "revision-new-1",
  bookingId: "booking-ota-1",
  propertyId: "external-property-1",
  uniqueId: "unique-ota-1",
  systemId: "system-ota-1",
  otaReservationCode: "OTA-123",
  otaName: "Booking.com",
  status: "new",
  arrivalDate: "2026-06-01",
  departureDate: "2026-06-03",
  guestName: "External Guest",
  amount: "200.00",
  currency: "EUR",
  insertedAt: "2026-05-21T10:00:00Z",
  roomTypeId: "external-room-type-1",
  ratePlanId: "external-rate-plan-1",
  rawPayload: {
    id: "revision-new-1",
    attributes: {
      booking_id: "booking-ota-1",
      property_id: "external-property-1",
      status: "new",
      arrival_date: "2026-06-01",
      departure_date: "2026-06-03",
      customer: { name: "External Guest" },
      rooms: [{ room_type_id: "external-room-type-1", rate_plan_id: "external-rate-plan-1" }],
    },
  },
  ...overrides,
});

const createService = ({
  account = {
    id: "integration-account-1",
    status: "CONNECTED",
    credentialsRef: "channex-secret-1",
  },
  revisionRows = [buildRevisionRow()],
  propertyMappings = [
    {
      domitsPropertyId: "domits-property-1",
      externalPropertyId: "external-property-1",
      externalPropertyName: "Test Property",
      status: "ACTIVE",
    },
  ],
  roomTypeMappings = [
    {
      domitsPropertyId: "domits-property-1",
      externalPropertyId: "external-property-1",
      externalRoomTypeId: "external-room-type-1",
      externalRoomTypeName: "Demo room",
      status: "ACTIVE",
    },
  ],
  ratePlanMappings = [
    {
      domitsPropertyId: "domits-property-1",
      externalPropertyId: "external-property-1",
      externalRoomTypeId: "external-room-type-1",
      externalRatePlanId: "external-rate-plan-1",
      externalRatePlanName: "Standard",
      status: "ACTIVE",
    },
  ],
  existingRevision = buildRevisionRow(),
  existingLink = null,
  feedRevisions = [],
  propertyContext = {
    propertyId: "domits-property-1",
    hostId: "host-1",
    propertyName: "Demo property",
  },
  initialBookings = [],
} = {}) => {
  let storedRevision = existingRevision;
  let storedLink = existingLink;
  const bookingRowsById = new Map(initialBookings.map((booking) => [booking.id, booking]));
  const accounts = {
    findByUserIdAndChannel: jest.fn().mockResolvedValue(account),
  };
  const props = {
    listByAccountId: jest.fn().mockResolvedValue(propertyMappings),
  };
  const roomTypes = {
    listByAccountId: jest.fn().mockResolvedValue(roomTypeMappings),
  };
  const ratePlans = {
    listByAccountId: jest.fn().mockResolvedValue(ratePlanMappings),
  };
  const resLinks = {
    getByIntegrationAccountIdAndExternalReservation: jest.fn().mockImplementation(async () => storedLink),
    upsert: jest.fn(async (data) => {
      storedLink = {
        id: storedLink?.id || "reservation-link-1",
        ...data,
        createdAt: storedLink?.createdAt || 1770000000000,
        updatedAt: 1770000001000,
      };
      return storedLink;
    }),
  };
  const channexBookingRevisions = {
    listByFilters: jest.fn().mockResolvedValue(revisionRows),
    getByIntegrationAccountIdAndRevisionId: jest.fn().mockImplementation(async () => storedRevision),
    upsert: jest.fn(async (data) => {
      storedRevision = buildRevisionRow({
        id: storedRevision?.id || "local-revision-1",
        ...data,
      });
      return storedRevision;
    }),
    markAcknowledged: jest.fn(async (_integrationAccountId, revisionId, acknowledgedAt) =>
      {
        storedRevision = buildRevisionRow({
          ...(storedRevision || {}),
          revisionId,
          acknowledgementState: "ACKNOWLEDGED",
          acknowledgedAt,
        });
        return storedRevision;
      }
    ),
  };
  const externalBookingImportRepository = {
    getDomitsPropertyContext: jest.fn().mockResolvedValue(propertyContext),
    getBookingById: jest.fn(async (bookingId) => bookingRowsById.get(bookingId) || null),
    createExternalBooking: jest.fn(async (data) => {
      const booking = {
        id: data.bookingId,
        propertyId: data.propertyId,
        hostId: data.hostId,
        guestName: data.guestName,
        arrivalDateMs: data.arrivalDateMs,
        departureDateMs: data.departureDateMs,
        status: "Paid",
      };
      bookingRowsById.set(data.bookingId, booking);
      return booking;
    }),
    updateImportedBooking: jest.fn(async ({ bookingId, guestName, arrivalDateMs, departureDateMs }) => {
      const existing = bookingRowsById.get(bookingId);
      if (!existing) return null;
      const updated = { ...existing, guestName, arrivalDateMs, departureDateMs, status: "Paid" };
      bookingRowsById.set(bookingId, updated);
      return updated;
    }),
    cancelImportedBooking: jest.fn(async (bookingId) => {
      const existing = bookingRowsById.get(bookingId);
      if (!existing) return null;
      const cancelled = { ...existing, status: "Cancelled" };
      bookingRowsById.set(bookingId, cancelled);
      return cancelled;
    }),
  };
  const channexProviderClient = {
    listBookingRevisionFeed: jest.fn().mockResolvedValue({
      success: true,
      revisions: feedRevisions,
      providerStatus: "ACTIVE",
      errorCode: null,
      errorMessage: null,
    }),
    getBookingRevision: jest.fn(),
    acknowledgeBookingRevision: jest.fn().mockResolvedValue({
      success: true,
      providerStatus: "ACKNOWLEDGED",
      errorCode: null,
      errorMessage: null,
    }),
  };

  const service = new IntegrationService({
    accounts,
    props,
    ratePlans,
    roomTypes,
    sync: {},
    resLinks,
    channexEvidence: {},
    channexBookingRevisions,
    externalBookingImportRepository,
    runner: {},
    credentialStore: {},
    holiduCredentialStore: {},
    holiduProviderClient: {},
    channexCredentialStore: {
      readSecretOrNull: jest.fn().mockResolvedValue({ apiKey: "secret" }),
    },
    channexProviderClient,
  });

  return {
    service,
    accounts,
    props,
    ratePlans,
    roomTypes,
    resLinks,
    channexBookingRevisions,
    channexProviderClient,
    externalBookingImportRepository,
  };
};

describe("IntegrationService Channex booking revision listing", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("missing userId returns a validation response", async () => {
    const { service, accounts, channexBookingRevisions } = createService();

    const result = await service.listChannexBookingRevisions(null, {
      domitsPropertyId: "domits-property-1",
    });

    expect(result).toEqual({
      statusCode: 400,
      response: { error: "Missing required query param: userId" },
    });
    expect(accounts.findByUserIdAndChannel).not.toHaveBeenCalled();
    expect(channexBookingRevisions.listByFilters).not.toHaveBeenCalled();
  });

  test("missing domitsPropertyId returns a validation response", async () => {
    const { service, accounts, channexBookingRevisions } = createService();

    const result = await service.listChannexBookingRevisions("user-1");

    expect(result).toEqual({
      statusCode: 400,
      response: { error: "Missing required query param: domitsPropertyId" },
    });
    expect(accounts.findByUserIdAndChannel).not.toHaveBeenCalled();
    expect(channexBookingRevisions.listByFilters).not.toHaveBeenCalled();
  });

  test("happy path lists persisted revisions without raw payload by default", async () => {
    const row = buildRevisionRow();
    const { service } = createService({ revisionRows: [row] });

    const result = await service.listChannexBookingRevisions("user-1", {
      domitsPropertyId: "domits-property-1",
    });

    expect(result.statusCode).toBe(200);
    expect(result.response).toMatchObject({
      channel: "CHANNEX",
      integrationAccountId: "integration-account-1",
      domitsPropertyId: "domits-property-1",
      count: 1,
      includeRawPayload: false,
    });
    expect(result.response.revisions).toEqual([
      {
        id: row.id,
        integrationAccountId: row.integrationAccountId,
        domitsPropertyId: row.domitsPropertyId,
        externalPropertyId: row.externalPropertyId,
        externalReservationId: row.externalReservationId,
        revisionId: row.revisionId,
        bookingStatus: row.bookingStatus,
        arrivalDate: row.arrivalDate,
        departureDate: row.departureDate,
        guestSummary: row.guestSummary,
        acknowledgementState: row.acknowledgementState,
        acknowledgedAt: row.acknowledgedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    ]);
    expect(result.response.revisions[0]).not.toHaveProperty("rawPayload");
  });

  test("filters returned rows by domitsPropertyId", async () => {
    const { service, channexBookingRevisions } = createService({
      revisionRows: [
        buildRevisionRow({ id: "match", domitsPropertyId: "domits-property-1" }),
        buildRevisionRow({ id: "other-property", domitsPropertyId: "domits-property-2" }),
      ],
    });

    const result = await service.listChannexBookingRevisions("user-1", {
      domitsPropertyId: "domits-property-1",
    });

    expect(channexBookingRevisions.listByFilters).toHaveBeenCalledWith({
      integrationAccountId: "integration-account-1",
      domitsPropertyId: "domits-property-1",
      limit: 50,
    });
    expect(result.response.revisions).toHaveLength(1);
    expect(result.response.revisions[0].id).toBe("match");
  });

  test("uses default limit 50", async () => {
    const { service, channexBookingRevisions } = createService();

    const result = await service.listChannexBookingRevisions("user-1", {
      domitsPropertyId: "domits-property-1",
    });

    expect(result.response.limit).toBe(50);
    expect(channexBookingRevisions.listByFilters).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 50 })
    );
  });

  test("clamps limit to max 100", async () => {
    const { service, channexBookingRevisions } = createService();

    const result = await service.listChannexBookingRevisions("user-1", {
      domitsPropertyId: "domits-property-1",
      limit: 999,
    });

    expect(result.response.limit).toBe(100);
    expect(channexBookingRevisions.listByFilters).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 100 })
    );
  });

  test("includes rawPayload only when requested", async () => {
    const rawPayload = { provider: "CHANNEX", payload: { id: "revision-1", guest: "Guest Example" } };
    const { service } = createService({
      revisionRows: [buildRevisionRow({ rawPayload: JSON.stringify(rawPayload) })],
    });

    const result = await service.listChannexBookingRevisions("user-1", {
      domitsPropertyId: "domits-property-1",
      includeRawPayload: true,
    });

    expect(result.response.includeRawPayload).toBe(true);
    expect(result.response.revisions[0].rawPayload).toEqual(rawPayload);
  });

  test("does not leak rows from another integration account", async () => {
    const { service } = createService({
      revisionRows: [
        buildRevisionRow({ id: "own-account", integrationAccountId: "integration-account-1" }),
        buildRevisionRow({ id: "other-account", integrationAccountId: "integration-account-2" }),
      ],
    });

    const result = await service.listChannexBookingRevisions("user-1", {
      domitsPropertyId: "domits-property-1",
    });

    expect(result.response.revisions).toHaveLength(1);
    expect(result.response.revisions[0].id).toBe("own-account");
  });

  test("does not call the Channex provider client", async () => {
    const { service, channexProviderClient } = createService();

    await service.listChannexBookingRevisions("user-1", {
      domitsPropertyId: "domits-property-1",
      includeRawPayload: true,
    });

    expect(channexProviderClient.listBookingRevisionFeed).not.toHaveBeenCalled();
    expect(channexProviderClient.getBookingRevision).not.toHaveBeenCalled();
    expect(channexProviderClient.acknowledgeBookingRevision).not.toHaveBeenCalled();
  });
});

describe("IntegrationService Channex booking acknowledgement", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("acknowledges a feed-persisted revision without fetching it by ID", async () => {
    const { service, channexBookingRevisions, channexProviderClient } = createService({
      existingRevision: buildRevisionRow({
        revisionId: "revision-feed-1",
        acknowledgementState: "RECEIVED",
        acknowledgedAt: null,
      }),
    });

    const result = await service.acknowledgeChannexBookingRevisions(
      "user-1",
      "domits-property-1",
      { revisionIds: ["revision-feed-1"] },
      { skipEvidence: true }
    );

    expect(result.statusCode).toBe(200);
    expect(result.response.acknowledgedCount).toBe(1);
    expect(result.response.fetchedCount).toBe(0);
    expect(channexProviderClient.getBookingRevision).not.toHaveBeenCalled();
    expect(channexProviderClient.acknowledgeBookingRevision).toHaveBeenCalledWith(
      { apiKey: "secret" },
      "revision-feed-1"
    );
    expect(channexBookingRevisions.markAcknowledged).toHaveBeenCalledWith(
      "integration-account-1",
      "revision-feed-1",
      expect.any(Number)
    );
    expect(result.response.notes).toContain(
      "Manual staging booking acknowledgement only. This endpoint uses persisted booking revisions received from the Channex feed and does not fetch the same revision by ID."
    );
  });

  test("does not acknowledge revisions that were not received through feed first", async () => {
    const { service, channexProviderClient } = createService({
      existingRevision: null,
    });

    const result = await service.acknowledgeChannexBookingRevisions(
      "user-1",
      "domits-property-1",
      { revisionIds: ["revision-missing"] },
      { skipEvidence: true }
    );

    expect(result.statusCode).toBe(200);
    expect(result.response.overallSuccess).toBe(false);
    expect(result.response.failed).toEqual([
      expect.objectContaining({
        revisionId: "revision-missing",
        errorCode: "CHANNEX_BOOKING_REVISION_NOT_RECEIVED_BY_FEED",
      }),
    ]);
    expect(channexProviderClient.getBookingRevision).not.toHaveBeenCalled();
    expect(channexProviderClient.acknowledgeBookingRevision).not.toHaveBeenCalled();
  });
});

describe("IntegrationService Channex booking pull import", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("pulls feed revisions, persists raw data, creates a mapped Domits booking, links it, then acknowledges", async () => {
    const revision = buildFeedRevision();
    const {
      service,
      channexBookingRevisions,
      channexProviderClient,
      externalBookingImportRepository,
      resLinks,
    } = createService({
      feedRevisions: [revision],
      existingRevision: null,
    });

    const result = await service.pullLatestChannexBookings("user-1", "domits-property-1", {
      skipEvidence: true,
    });

    expect(result.statusCode).toBe(200);
    expect(result.response).toMatchObject({
      channel: "CHANNEX",
      action: "pull-latest-bookings",
      endpointCalled: "/api/v1/booking_revisions/feed",
      fetchedCount: 1,
      rawPersistedCount: 1,
      createdBookingCount: 1,
      updatedBookingCount: 0,
      cancelledBookingCount: 0,
      skippedCount: 0,
      ackedCount: 1,
      unackedCount: 0,
      overallSuccess: true,
    });
    expect(channexProviderClient.listBookingRevisionFeed).toHaveBeenCalledWith(
      { apiKey: "secret" },
      { externalPropertyId: "external-property-1" }
    );
    expect(channexBookingRevisions.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        integrationAccountId: "integration-account-1",
        domitsPropertyId: "domits-property-1",
        externalPropertyId: "external-property-1",
        externalReservationId: "booking-ota-1",
        revisionId: "revision-new-1",
        bookingStatus: "new",
      })
    );
    expect(externalBookingImportRepository.createExternalBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyId: "domits-property-1",
        hostId: "host-1",
        externalReservationId: "booking-ota-1",
        guestName: "External Guest",
        arrivalDateMs: Date.parse("2026-06-01T00:00:00.000Z"),
        departureDateMs: Date.parse("2026-06-03T00:00:00.000Z"),
      })
    );
    expect(resLinks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        integrationAccountId: "integration-account-1",
        channel: "CHANNEX",
        externalReservationId: "booking-ota-1",
        domitsPropertyId: "domits-property-1",
        guestName: "External Guest",
        checkInAt: Date.parse("2026-06-01T00:00:00.000Z"),
        checkOutAt: Date.parse("2026-06-03T00:00:00.000Z"),
        reservationStatus: "Paid",
        ratePlan: "Standard",
        paymentStatus: "EXTERNAL",
      })
    );
    expect(channexProviderClient.acknowledgeBookingRevision).toHaveBeenCalledWith(
      { apiKey: "secret" },
      "revision-new-1"
    );
    expect(channexBookingRevisions.markAcknowledged).toHaveBeenCalledWith(
      "integration-account-1",
      "revision-new-1",
      expect.any(Number)
    );
    expect(channexBookingRevisions.upsert.mock.invocationCallOrder[0]).toBeLessThan(
      externalBookingImportRepository.createExternalBooking.mock.invocationCallOrder[0]
    );
    expect(externalBookingImportRepository.createExternalBooking.mock.invocationCallOrder[0]).toBeLessThan(
      resLinks.upsert.mock.invocationCallOrder[0]
    );
    expect(resLinks.upsert.mock.invocationCallOrder[0]).toBeLessThan(
      channexProviderClient.acknowledgeBookingRevision.mock.invocationCallOrder[0]
    );
    expect(result.response.items[0]).toEqual(
      expect.objectContaining({
        revisionId: "revision-new-1",
        bookingId: "booking-ota-1",
        status: "new",
        result: "created-and-acked",
        createdBooking: true,
        acked: true,
        unacked: false,
      })
    );
  });

  test("does not call the feed or acknowledge when property mapping is missing", async () => {
    const { service, channexProviderClient } = createService({
      propertyMappings: [],
      feedRevisions: [buildFeedRevision()],
    });

    const result = await service.pullLatestChannexBookings("user-1", "domits-property-1", {
      skipEvidence: true,
    });

    expect(result.statusCode).toBe(409);
    expect(result.response.errorCode).toBe("CHANNEX_PROPERTY_MAPPING_MISSING");
    expect(channexProviderClient.listBookingRevisionFeed).not.toHaveBeenCalled();
    expect(channexProviderClient.acknowledgeBookingRevision).not.toHaveBeenCalled();
  });

  test("does not create or acknowledge when the room type mapping is missing", async () => {
    const { service, channexProviderClient, externalBookingImportRepository } = createService({
      roomTypeMappings: [],
      feedRevisions: [buildFeedRevision()],
      existingRevision: null,
    });

    const result = await service.pullLatestChannexBookings("user-1", "domits-property-1", {
      skipEvidence: true,
    });

    expect(result.statusCode).toBe(200);
    expect(result.response).toMatchObject({
      fetchedCount: 1,
      rawPersistedCount: 1,
      skippedCount: 1,
      ackedCount: 0,
      unackedCount: 1,
      overallSuccess: false,
    });
    expect(result.response.warnings).toEqual([
      expect.objectContaining({
        code: "CHANNEX_ROOM_TYPE_MAPPING_MISSING",
      }),
    ]);
    expect(externalBookingImportRepository.createExternalBooking).not.toHaveBeenCalled();
    expect(channexProviderClient.acknowledgeBookingRevision).not.toHaveBeenCalled();
  });

  test("does not create or acknowledge when the rate plan mapping is missing", async () => {
    const { service, channexProviderClient, externalBookingImportRepository } = createService({
      ratePlanMappings: [],
      feedRevisions: [buildFeedRevision()],
      existingRevision: null,
    });

    const result = await service.pullLatestChannexBookings("user-1", "domits-property-1", {
      skipEvidence: true,
    });

    expect(result.statusCode).toBe(200);
    expect(result.response).toMatchObject({
      fetchedCount: 1,
      rawPersistedCount: 1,
      skippedCount: 1,
      ackedCount: 0,
      unackedCount: 1,
      overallSuccess: false,
    });
    expect(result.response.warnings).toEqual([
      expect.objectContaining({
        code: "CHANNEX_RATE_PLAN_MAPPING_MISSING",
      }),
    ]);
    expect(externalBookingImportRepository.createExternalBooking).not.toHaveBeenCalled();
    expect(channexProviderClient.acknowledgeBookingRevision).not.toHaveBeenCalled();
  });

  test("duplicate pulls reuse the imported booking and do not create duplicates", async () => {
    const revision = buildFeedRevision();
    const { service, channexProviderClient, externalBookingImportRepository } = createService({
      feedRevisions: [revision],
      existingRevision: null,
    });

    const firstResult = await service.pullLatestChannexBookings("user-1", "domits-property-1", {
      skipEvidence: true,
    });
    const secondResult = await service.pullLatestChannexBookings("user-1", "domits-property-1", {
      skipEvidence: true,
    });

    expect(firstResult.response.createdBookingCount).toBe(1);
    expect(secondResult.response.createdBookingCount).toBe(0);
    expect(secondResult.response.items[0]).toEqual(
      expect.objectContaining({
        result: "already-imported-and-acked",
        createdBooking: false,
        acked: true,
        unacked: false,
      })
    );
    expect(externalBookingImportRepository.createExternalBooking).toHaveBeenCalledTimes(1);
    expect(channexProviderClient.acknowledgeBookingRevision).toHaveBeenCalledTimes(1);
  });

  test("skips unsupported multi-room revisions without acknowledging", async () => {
    const revision = buildFeedRevision({
      rawPayload: {
        id: "revision-new-1",
        attributes: {
          booking_id: "booking-ota-1",
          property_id: "external-property-1",
          status: "new",
          arrival_date: "2026-06-01",
          departure_date: "2026-06-03",
          customer: { name: "External Guest" },
          rooms: [
            { room_type_id: "external-room-type-1", rate_plan_id: "external-rate-plan-1" },
            { room_type_id: "external-room-type-2", rate_plan_id: "external-rate-plan-2" },
          ],
        },
      },
    });
    const { service, channexProviderClient, externalBookingImportRepository } = createService({
      feedRevisions: [revision],
      existingRevision: null,
    });

    const result = await service.pullLatestChannexBookings("user-1", "domits-property-1", {
      skipEvidence: true,
    });

    expect(result.response).toMatchObject({
      skippedCount: 1,
      ackedCount: 0,
      unackedCount: 1,
      overallSuccess: false,
    });
    expect(result.response.warnings).toEqual([
      expect.objectContaining({
        code: "CHANNEX_BOOKING_MULTI_ROOM_UNSUPPORTED",
      }),
    ]);
    expect(externalBookingImportRepository.createExternalBooking).not.toHaveBeenCalled();
    expect(channexProviderClient.acknowledgeBookingRevision).not.toHaveBeenCalled();
  });

  test("modified and cancelled revisions without imported links are explicit skipped/unacked results", async () => {
    const { service, channexProviderClient } = createService({
      feedRevisions: [
        buildFeedRevision({
          revisionId: "revision-modified-1",
          bookingId: "booking-modified-1",
          status: "modified",
          rawPayload: {
            id: "revision-modified-1",
            attributes: {
              booking_id: "booking-modified-1",
              property_id: "external-property-1",
              status: "modified",
              arrival_date: "2026-06-01",
              departure_date: "2026-06-03",
              rooms: [{ room_type_id: "external-room-type-1", rate_plan_id: "external-rate-plan-1" }],
            },
          },
        }),
        buildFeedRevision({
          revisionId: "revision-cancelled-1",
          bookingId: "booking-cancelled-1",
          status: "cancelled",
          rawPayload: {
            id: "revision-cancelled-1",
            attributes: {
              booking_id: "booking-cancelled-1",
              property_id: "external-property-1",
              status: "cancelled",
              arrival_date: "2026-06-01",
              departure_date: "2026-06-03",
              rooms: [{ room_type_id: "external-room-type-1", rate_plan_id: "external-rate-plan-1" }],
            },
          },
        }),
      ],
      existingRevision: null,
    });

    const result = await service.pullLatestChannexBookings("user-1", "domits-property-1", {
      skipEvidence: true,
    });

    expect(result.response).toMatchObject({
      fetchedCount: 2,
      rawPersistedCount: 2,
      skippedCount: 2,
      ackedCount: 0,
      unackedCount: 2,
      overallSuccess: false,
    });
    expect(result.response.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "CHANNEX_MODIFIED_BOOKING_LINK_MISSING",
          message: "modified revision not imported because no linked Domits booking was found",
        }),
        expect.objectContaining({
          code: "CHANNEX_CANCELLED_BOOKING_LINK_MISSING",
          message: "cancelled revision not imported because no linked Domits booking was found",
        }),
      ])
    );
    expect(channexProviderClient.acknowledgeBookingRevision).not.toHaveBeenCalled();
  });

  test("linked modified revisions update basic Domits booking fields before acknowledgement", async () => {
    const existingLink = {
      id: "reservation-link-1",
      rawPayload: JSON.stringify({
        domits: { bookingId: "domits-booking-1" },
      }),
    };
    const { service, channexProviderClient, externalBookingImportRepository, resLinks } = createService({
      existingLink,
      initialBookings: [
        {
          id: "domits-booking-1",
          guestName: "Original Guest",
          arrivalDateMs: Date.parse("2026-06-01T00:00:00.000Z"),
          departureDateMs: Date.parse("2026-06-03T00:00:00.000Z"),
          status: "Paid",
        },
      ],
      feedRevisions: [
        buildFeedRevision({
          revisionId: "revision-modified-1",
          bookingId: "booking-ota-1",
          status: "modified",
          arrivalDate: "2026-06-02",
          departureDate: "2026-06-04",
          guestName: "Modified Guest",
          rawPayload: {
            id: "revision-modified-1",
            attributes: {
              booking_id: "booking-ota-1",
              property_id: "external-property-1",
              status: "modified",
              arrival_date: "2026-06-02",
              departure_date: "2026-06-04",
              customer: { name: "Modified Guest" },
              rooms: [{ room_type_id: "external-room-type-1", rate_plan_id: "external-rate-plan-1" }],
            },
          },
        }),
      ],
      existingRevision: null,
    });

    const result = await service.pullLatestChannexBookings("user-1", "domits-property-1", {
      skipEvidence: true,
    });

    expect(result.response).toMatchObject({
      fetchedCount: 1,
      rawPersistedCount: 1,
      updatedBookingCount: 1,
      ackedCount: 1,
      unackedCount: 0,
      overallSuccess: true,
    });
    expect(externalBookingImportRepository.createExternalBooking).not.toHaveBeenCalled();
    expect(externalBookingImportRepository.updateImportedBooking).toHaveBeenCalledWith({
      bookingId: "domits-booking-1",
      guestName: "Modified Guest",
      arrivalDateMs: Date.parse("2026-06-02T00:00:00.000Z"),
      departureDateMs: Date.parse("2026-06-04T00:00:00.000Z"),
    });
    expect(resLinks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        externalReservationId: "booking-ota-1",
        reservationStatus: "Paid",
        guestName: "Modified Guest",
      })
    );
    expect(channexProviderClient.acknowledgeBookingRevision).toHaveBeenCalledWith(
      { apiKey: "secret" },
      "revision-modified-1"
    );
  });

  test("linked cancelled revisions cancel the Domits booking before acknowledgement", async () => {
    const existingLink = {
      id: "reservation-link-1",
      rawPayload: JSON.stringify({
        domits: { bookingId: "domits-booking-1" },
      }),
    };
    const { service, channexProviderClient, externalBookingImportRepository, resLinks } = createService({
      existingLink,
      initialBookings: [
        {
          id: "domits-booking-1",
          guestName: "External Guest",
          arrivalDateMs: Date.parse("2026-06-01T00:00:00.000Z"),
          departureDateMs: Date.parse("2026-06-03T00:00:00.000Z"),
          status: "Paid",
        },
      ],
      feedRevisions: [
        buildFeedRevision({
          revisionId: "revision-cancelled-1",
          bookingId: "booking-ota-1",
          status: "cancelled",
          rawPayload: {
            id: "revision-cancelled-1",
            attributes: {
              booking_id: "booking-ota-1",
              property_id: "external-property-1",
              status: "cancelled",
              arrival_date: "2026-06-01",
              departure_date: "2026-06-03",
              rooms: [{ room_type_id: "external-room-type-1", rate_plan_id: "external-rate-plan-1" }],
            },
          },
        }),
      ],
      existingRevision: null,
    });

    const result = await service.pullLatestChannexBookings("user-1", "domits-property-1", {
      skipEvidence: true,
    });

    expect(result.response).toMatchObject({
      fetchedCount: 1,
      rawPersistedCount: 1,
      cancelledBookingCount: 1,
      ackedCount: 1,
      unackedCount: 0,
      overallSuccess: true,
    });
    expect(externalBookingImportRepository.createExternalBooking).not.toHaveBeenCalled();
    expect(externalBookingImportRepository.cancelImportedBooking).toHaveBeenCalledWith("domits-booking-1");
    expect(resLinks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        externalReservationId: "booking-ota-1",
        reservationStatus: "Cancelled",
      })
    );
    expect(channexProviderClient.acknowledgeBookingRevision).toHaveBeenCalledWith(
      { apiKey: "secret" },
      "revision-cancelled-1"
    );
  });

  test("redacts sensitive payment fields from imported reservation link raw payload", async () => {
    const { service, resLinks } = createService({
      feedRevisions: [
        buildFeedRevision({
          rawPayload: {
            id: "revision-new-1",
            attributes: {
              booking_id: "booking-ota-1",
              property_id: "external-property-1",
              status: "new",
              arrival_date: "2026-06-01",
              departure_date: "2026-06-03",
              guarantee: {
                card_number: "4111111111111111",
                cvc: "999",
              },
              payment: {
                token: "payment-token-secret",
              },
              rooms: [{ room_type_id: "external-room-type-1", rate_plan_id: "external-rate-plan-1" }],
            },
          },
        }),
      ],
      existingRevision: null,
    });

    const result = await service.pullLatestChannexBookings("user-1", "domits-property-1", {
      skipEvidence: true,
    });

    expect(result.response.createdBookingCount).toBe(1);
    const rawPayload = resLinks.upsert.mock.calls[0][0].rawPayload;
    expect(rawPayload).toContain("[REDACTED]");
    expect(rawPayload).not.toContain("4111111111111111");
    expect(rawPayload).not.toContain("payment-token-secret");
    expect(rawPayload).not.toContain("999");
    expect(JSON.parse(rawPayload)).toEqual(
      expect.objectContaining({
        importedBy: "channex-booking-pull",
        domits: expect.objectContaining({
          bookingId: expect.any(String),
        }),
      })
    );
  });

  test("booking or link import failures leave the revision unacked", async () => {
    const { service, channexProviderClient, resLinks } = createService({
      feedRevisions: [buildFeedRevision()],
      existingRevision: null,
    });
    resLinks.upsert.mockRejectedValueOnce(new Error("link insert failed"));

    const result = await service.pullLatestChannexBookings("user-1", "domits-property-1", {
      skipEvidence: true,
    });

    expect(result.response).toMatchObject({
      rawPersistedCount: 1,
      ackedCount: 0,
      unackedCount: 1,
      overallSuccess: false,
    });
    expect(result.response.items[0]).toEqual(
      expect.objectContaining({
        result: "import-failed-unacked",
        errors: [
          expect.objectContaining({
            message: "link insert failed",
          }),
        ],
      })
    );
    expect(channexProviderClient.acknowledgeBookingRevision).not.toHaveBeenCalled();
  });
});
