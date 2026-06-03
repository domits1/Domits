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

const channexBookingRevisionFixture = require("./integrationService.channexBookingRevisions.fixture.js");

const buildCancellationAvailabilityEvidence =
  channexBookingRevisionFixture.buildCancellationAvailabilityEvidence;
const buildFeedRevision = channexBookingRevisionFixture.buildFeedRevision;
const buildImportedBookingRow = channexBookingRevisionFixture.buildImportedBookingRow;
const buildIntegrationAccount = channexBookingRevisionFixture.buildIntegrationAccount;
const buildPropertyContext = channexBookingRevisionFixture.buildPropertyContext;
const buildPropertyMapping = channexBookingRevisionFixture.buildPropertyMapping;
const buildRatePlanMapping = channexBookingRevisionFixture.buildRatePlanMapping;
const buildReservationLinkRow = channexBookingRevisionFixture.buildReservationLinkRow;
const buildRevisionRawPayload = channexBookingRevisionFixture.buildRevisionRawPayload;
const buildRevisionRoomLine = channexBookingRevisionFixture.buildRevisionRoomLine;
const buildRevisionRow = channexBookingRevisionFixture.buildRevisionRow;
const buildRoomTypeMapping = channexBookingRevisionFixture.buildRoomTypeMapping;
const createService = channexBookingRevisionFixture.createService;

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
      rawPayload: buildRevisionRawPayload({
        rooms: [buildRevisionRoomLine(), buildRevisionRoomLine({ room_type_id: "external-room-type-2" })],
      }),
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
        }),
        buildFeedRevision({
          revisionId: "revision-cancelled-1",
          bookingId: "booking-cancelled-1",
          status: "cancelled",
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
    const existingLink = buildReservationLinkRow();
    const { service, channexProviderClient, externalBookingImportRepository, resLinks } = createService({
      existingLink,
      initialBookings: [
        buildImportedBookingRow({
          id: "domits-booking-1",
          guestName: "Original Guest",
        }),
      ],
      feedRevisions: [
        buildFeedRevision({
          revisionId: "revision-modified-1",
          bookingId: "booking-ota-1",
          status: "modified",
          arrivalDate: "2026-06-02",
          departureDate: "2026-06-04",
          guestName: "Modified Guest",
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
    const existingLink = buildReservationLinkRow();
    const { service, channexProviderClient, externalBookingImportRepository, resLinks } = createService({
      existingLink,
      initialBookings: [
        buildImportedBookingRow({
          id: "domits-booking-1",
        }),
      ],
      feedRevisions: [
        buildFeedRevision({
          revisionId: "revision-cancelled-1",
          bookingId: "booking-ota-1",
          status: "cancelled",
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

  test("redacts sensitive payment fields from persisted revision and imported reservation link raw payloads", async () => {
    const { service, channexBookingRevisions, resLinks } = createService({
      feedRevisions: [
        buildFeedRevision({
          rawPayload: buildRevisionRawPayload({
            attributes: {
              guarantee: {
                card_number: "SENSITIVE_CARD_NUMBER",
                cvc: "SENSITIVE_CVC_VALUE",
              },
              credit_card: {
                cvv: "SENSITIVE_CVV_VALUE",
                card_holder_name: "SENSITIVE_CARD_HOLDER",
              },
              card: {
                number: "SENSITIVE_CARD_OBJECT",
              },
              payment_card: {
                number: "SENSITIVE_PAYMENT_CARD",
              },
              paymentCard: {
                number: "SENSITIVE_CAMEL_PAYMENT_CARD",
              },
              payment: {
                token: "SENSITIVE_PAYMENT_TOKEN",
              },
              payment_credentials: {
                token: "SENSITIVE_CREDENTIAL_TOKEN",
              },
            },
          }),
        }),
      ],
      existingRevision: null,
    });

    const result = await service.pullLatestChannexBookings("user-1", "domits-property-1", {
      skipEvidence: true,
    });

    expect(result.response.createdBookingCount).toBe(1);
    const persistedRevisionPayload = channexBookingRevisions.upsert.mock.calls[0][0].rawPayload;
    const linkRawPayload = resLinks.upsert.mock.calls[0][0].rawPayload;
    const combinedPayloads = `${persistedRevisionPayload}\n${linkRawPayload}`;
    expect(combinedPayloads).toContain("[REDACTED]");
    for (const sensitiveValue of [
      "SENSITIVE_CARD_NUMBER",
      "SENSITIVE_CVC_VALUE",
      "SENSITIVE_CVV_VALUE",
      "SENSITIVE_CARD_HOLDER",
      "SENSITIVE_CARD_OBJECT",
      "SENSITIVE_PAYMENT_CARD",
      "SENSITIVE_CAMEL_PAYMENT_CARD",
      "SENSITIVE_PAYMENT_TOKEN",
      "SENSITIVE_CREDENTIAL_TOKEN",
    ]) {
      expect(combinedPayloads).not.toContain(sensitiveValue);
    }
    expect(JSON.parse(persistedRevisionPayload)).toEqual(
      expect.objectContaining({
        provider: "CHANNEX",
        bookingId: "booking-ota-1",
        status: "new",
        arrivalDate: "2026-06-01",
        departureDate: "2026-06-03",
        payload: expect.objectContaining({
          attributes: expect.objectContaining({
            guarantee: "[REDACTED]",
            credit_card: "[REDACTED]",
            card: "[REDACTED]",
            payment_card: "[REDACTED]",
            paymentCard: "[REDACTED]",
            payment_credentials: "[REDACTED]",
            payment: expect.objectContaining({
              token: "[REDACTED]",
            }),
          }),
        }),
      })
    );
    expect(JSON.parse(linkRawPayload)).toEqual(
      expect.objectContaining({
        importedBy: "channex-booking-pull",
        domits: expect.objectContaining({
          bookingId: expect.any(String),
        }),
      })
    );
  });

  test("reuses an existing deterministic Domits booking without creating another booking", async () => {
    const { service, channexProviderClient, externalBookingImportRepository } = createService({
      feedRevisions: [buildFeedRevision()],
      existingRevision: null,
    });
    externalBookingImportRepository.getBookingById.mockImplementation(async (bookingId) => ({
      ...buildImportedBookingRow({ id: bookingId }),
      guestName: "Existing External Guest",
    }));

    const result = await service.pullLatestChannexBookings("user-1", "domits-property-1", {
      skipEvidence: true,
    });

    expect(result.response).toMatchObject({
      fetchedCount: 1,
      createdBookingCount: 0,
      ackedCount: 1,
      unackedCount: 0,
      overallSuccess: true,
    });
    expect(result.response.items[0]).toEqual(
      expect.objectContaining({
        result: "already-imported-and-acked",
        createdBooking: false,
      })
    );
    expect(externalBookingImportRepository.createExternalBooking).not.toHaveBeenCalled();
    expect(channexProviderClient.acknowledgeBookingRevision).toHaveBeenCalledWith(
      { apiKey: "secret" },
      "revision-new-1"
    );
  });

  test("recovers when a valid reservation link appears after an upsert race", async () => {
    const { service, channexProviderClient, externalBookingImportRepository, resLinks } = createService({
      feedRevisions: [buildFeedRevision()],
      existingRevision: null,
    });
    let createdBookingId = null;
    externalBookingImportRepository.getBookingById.mockImplementation(async (bookingId) =>
      bookingId === createdBookingId ? buildImportedBookingRow({ id: bookingId }) : null
    );
    externalBookingImportRepository.createExternalBooking.mockImplementation(async (data) => {
      createdBookingId = data.bookingId;
      return {
        id: data.bookingId,
        propertyId: data.propertyId,
        hostId: data.hostId,
        guestName: data.guestName,
        arrivalDateMs: data.arrivalDateMs,
        departureDateMs: data.departureDateMs,
        status: "Paid",
      };
    });
    let linkLookupCount = 0;
    resLinks.getByIntegrationAccountIdAndExternalReservation.mockImplementation(async () => {
      linkLookupCount += 1;
      if (linkLookupCount === 1) return null;
      return {
        id: "reservation-link-race",
        rawPayload: JSON.stringify({
          domits: { bookingId: createdBookingId },
        }),
      };
    });
    resLinks.upsert.mockRejectedValueOnce(new Error("duplicate reservation link"));

    const result = await service.pullLatestChannexBookings("user-1", "domits-property-1", {
      skipEvidence: true,
    });

    expect(result.response).toMatchObject({
      fetchedCount: 1,
      createdBookingCount: 1,
      ackedCount: 1,
      unackedCount: 0,
      overallSuccess: true,
    });
    expect(result.response.items[0]).toEqual(
      expect.objectContaining({
        linkId: "reservation-link-race",
        result: "created-and-acked",
      })
    );
    expect(resLinks.getByIntegrationAccountIdAndExternalReservation).toHaveBeenCalledTimes(2);
    expect(channexProviderClient.acknowledgeBookingRevision).toHaveBeenCalledWith(
      { apiKey: "secret" },
      "revision-new-1"
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
            code: "CHANNEX_RESERVATION_LINK_CONFIRM_FAILED",
            message:
              "ChannelReservationLink could not be confirmed after an upsert failure; Channex revision will remain unacked.",
          }),
        ],
      })
    );
    expect(channexProviderClient.acknowledgeBookingRevision).not.toHaveBeenCalled();
  });
});

describe("IntegrationService Channex certification admin cancellation", () => {
  test("cancels a mapped Domits booking and triggers one Channex cancellation availability sync", async () => {
    const bookingBefore = buildImportedBookingRow({
      id: "booking-demo-1",
      status: "Paid",
    });
    const evidence = buildCancellationAvailabilityEvidence();
    const channexBookingAvailabilityBridge = {
      syncAvailabilityForBookingChange: jest.fn().mockResolvedValue(evidence),
    };
    const { service, externalBookingImportRepository } = createService({
      initialBookings: [bookingBefore],
      channexBookingAvailabilityBridge,
    });

    const result = await service.cancelChannexCertificationBooking("admin-user", "domits-property-1", {
      bookingId: "booking-demo-1",
      reason: "CEO demo",
    });

    expect(result.statusCode).toBe(200);
    expect(externalBookingImportRepository.cancelImportedBooking).toHaveBeenCalledWith("booking-demo-1");
    expect(channexBookingAvailabilityBridge.syncAvailabilityForBookingChange).toHaveBeenCalledTimes(1);
    expect(channexBookingAvailabilityBridge.syncAvailabilityForBookingChange).toHaveBeenCalledWith({
      userId: "host-1",
      bookingBefore: expect.objectContaining({
        id: "booking-demo-1",
        property_id: "domits-property-1",
        hostid: "host-1",
        arrivaldate: bookingBefore.arrivalDateMs,
        departuredate: bookingBefore.departureDateMs,
        status: "Paid",
      }),
      bookingAfter: expect.objectContaining({
        id: "booking-demo-1",
        property_id: "domits-property-1",
        hostid: "host-1",
        status: "Cancelled",
      }),
      trigger: "BOOKING_CANCELLED",
    });
    expect(result.response).toMatchObject({
      channel: "CHANNEX",
      action: "certification-cancel-booking",
      mode: "admin-certification-no-refund",
      bookingId: "booking-demo-1",
      domitsPropertyId: "domits-property-1",
      previousStatus: "Paid",
      status: "Cancelled",
      refundProcessed: false,
      channexAvailabilitySync: evidence,
    });
  });

  test("does not cancel or sync a booking from another Domits property", async () => {
    const channexBookingAvailabilityBridge = {
      syncAvailabilityForBookingChange: jest.fn(),
    };
    const { service, externalBookingImportRepository } = createService({
      initialBookings: [
        buildImportedBookingRow({
          id: "booking-other-property",
          propertyId: "domits-property-2",
          status: "Paid",
        }),
      ],
      channexBookingAvailabilityBridge,
    });

    const result = await service.cancelChannexCertificationBooking("admin-user", "domits-property-1", {
      bookingId: "booking-other-property",
    });

    expect(result.statusCode).toBe(403);
    expect(result.response).toMatchObject({
      error: "BOOKING_PROPERTY_MISMATCH",
    });
    expect(externalBookingImportRepository.cancelImportedBooking).not.toHaveBeenCalled();
    expect(channexBookingAvailabilityBridge.syncAvailabilityForBookingChange).not.toHaveBeenCalled();
  });

  test("already-cancelled admin cancellation remains idempotent and does not call Channex", async () => {
    const channexBookingAvailabilityBridge = {
      syncAvailabilityForBookingChange: jest.fn(),
    };
    const { service, externalBookingImportRepository } = createService({
      initialBookings: [
        buildImportedBookingRow({
          id: "booking-cancelled-1",
          status: "Cancelled",
        }),
      ],
      channexBookingAvailabilityBridge,
    });

    const result = await service.cancelChannexCertificationBooking("admin-user", "domits-property-1", {
      bookingId: "booking-cancelled-1",
    });

    expect(result.statusCode).toBe(200);
    expect(externalBookingImportRepository.cancelImportedBooking).not.toHaveBeenCalled();
    expect(channexBookingAvailabilityBridge.syncAvailabilityForBookingChange).not.toHaveBeenCalled();
    expect(result.response).toMatchObject({
      alreadyCancelled: true,
      channexAvailabilitySync: expect.objectContaining({
        trigger: "BOOKING_CANCELLED",
        requestCount: 0,
        skipped: true,
        reason: "BOOKING_ALREADY_CANCELLED",
      }),
    });
  });
});

describe("IntegrationService Channex booking polling", () => {
  const enablePollingEnv = () => {
    process.env.CHANNEX_BOOKING_POLL_ENABLED = "true";
  };
  const buildEnabledPollOptions = (overrides = {}) => {
    enablePollingEnv();
    return {
      enabled: true,
      accountIds: ["integration-account-1"],
      domitsPropertyIds: ["domits-property-1"],
      ...overrides,
    };
  };

  afterEach(() => {
    delete process.env.CHANNEX_BOOKING_POLL_ENABLED;
    delete process.env.CHANNEX_BOOKING_POLL_ACCOUNT_IDS;
    delete process.env.CHANNEX_BOOKING_POLL_DOMITS_PROPERTY_IDS;
    delete process.env.CHANNEX_BOOKING_POLL_LOCK_STALE_MS;
    jest.restoreAllMocks();
  });

  test("returns a disabled response without polling when not enabled", async () => {
    const { service, accounts, channexProviderClient } = createService({
      feedRevisions: [buildFeedRevision()],
      existingRevision: null,
    });

    const result = await service.pollLatestChannexBookings();

    expect(result.statusCode).toBe(200);
    expect(result.response).toMatchObject({
      action: "poll-latest-bookings",
      syncType: "booking_poll",
      enabled: false,
      accountsChecked: 0,
      propertiesChecked: 0,
      fetchedCount: 0,
      overallSuccess: true,
    });
    expect(accounts.listByChannel).not.toHaveBeenCalled();
    expect(channexProviderClient.listBookingRevisionFeed).not.toHaveBeenCalled();
  });

  test("event enabled true does not override the disabled environment flag", async () => {
    const { service, accounts, channexProviderClient } = createService({
      feedRevisions: [buildFeedRevision()],
      existingRevision: null,
    });

    const result = await service.pollLatestChannexBookings({
      enabled: true,
      accountIds: ["integration-account-1"],
      domitsPropertyIds: ["domits-property-1"],
    });

    expect(result.response).toMatchObject({
      enabled: false,
      calledProvider: false,
      accountsChecked: 0,
      propertiesChecked: 0,
    });
    expect(accounts.listByChannel).not.toHaveBeenCalled();
    expect(channexProviderClient.listBookingRevisionFeed).not.toHaveBeenCalled();
  });

  test("does not poll when enabled without required allowlists", async () => {
    enablePollingEnv();
    const { service, accounts, channexProviderClient } = createService({
      feedRevisions: [buildFeedRevision()],
      existingRevision: null,
    });

    const result = await service.pollLatestChannexBookings({ enabled: true });

    expect(result.statusCode).toBe(200);
    expect(result.response).toMatchObject({
      enabled: true,
      calledProvider: false,
      accountsChecked: 0,
      propertiesChecked: 0,
      fetchedCount: 0,
      overallSuccess: false,
    });
    expect(result.response.warnings).toEqual([
      expect.objectContaining({ code: "CHANNEX_BOOKING_POLL_ALLOWLIST_REQUIRED" }),
    ]);
    expect(accounts.listByChannel).not.toHaveBeenCalled();
    expect(channexProviderClient.listBookingRevisionFeed).not.toHaveBeenCalled();
  });

  test("polls active Channex mappings through the same import core and writes evidence/logging", async () => {
    const revision = buildFeedRevision();
    const {
      service,
      accounts,
      props,
      sync,
      channexEvidence,
      channexProviderClient,
      externalBookingImportRepository,
    } = createService({
      account: buildIntegrationAccount({ userId: "user-1" }),
      feedRevisions: [revision],
      existingRevision: null,
    });

    const result = await service.pollLatestChannexBookings(buildEnabledPollOptions());

    expect(result.statusCode).toBe(200);
    expect(result.response).toMatchObject({
      action: "poll-latest-bookings",
      trigger: "EVENTBRIDGE_POLL",
      enabled: true,
      accountsChecked: 1,
      propertiesChecked: 1,
      fetchedCount: 1,
      rawPersistedCount: 1,
      createdBookingCount: 1,
      ackedCount: 1,
      unackedCount: 0,
      overallSuccess: true,
    });
    expect(accounts.listByChannel).toHaveBeenCalledWith("CHANNEX");
    expect(props.listByAccountId).toHaveBeenCalledWith("integration-account-1");
    expect(channexProviderClient.listBookingRevisionFeed).toHaveBeenCalledWith(
      { apiKey: "secret" },
      { externalPropertyId: "external-property-1" }
    );
    expect(externalBookingImportRepository.createExternalBooking).toHaveBeenCalledTimes(1);
    expect(channexProviderClient.acknowledgeBookingRevision).toHaveBeenCalledWith(
      { apiKey: "secret" },
      "revision-new-1"
    );
    expect(sync.tryAcquireLock).toHaveBeenCalledWith(
      "integration-account-1",
      "booking_poll:domits-property-1",
      expect.objectContaining({ staleBeforeMs: expect.any(Number) })
    );
    expect(sync.releaseLock).toHaveBeenCalledWith(
      "integration-account-1",
      "booking_poll:domits-property-1",
      expect.objectContaining({ status: "SUCCESS" })
    );
    expect(sync.insertLog).toHaveBeenCalledWith(
      expect.objectContaining({
        integrationAccountId: "integration-account-1",
        syncType: "booking_poll",
        direction: "IMPORT",
        status: "SUCCESS",
        itemsProcessed: 1,
      })
    );
    expect(channexEvidence.create).toHaveBeenCalledWith(
      expect.objectContaining({
        integrationAccountId: "integration-account-1",
        domitsPropertyId: "domits-property-1",
        syncType: "booking_poll",
        status: "SUCCESS",
        overallSuccess: true,
      })
    );
  });

  test("skips disconnected accounts and accounts without credentials", async () => {
    const channelAccounts = [
      { id: "disconnected-account", userId: "user-1", status: "DISCONNECTED", credentialsRef: "secret-1" },
      { id: "missing-credentials-account", userId: "user-2", status: "CONNECTED", credentialsRef: null },
    ];
    const { service, channexProviderClient } = createService({
      channelAccounts,
      feedRevisions: [buildFeedRevision()],
    });

    const result = await service.pollLatestChannexBookings(
      buildEnabledPollOptions({
        accountIds: ["disconnected-account", "missing-credentials-account"],
      })
    );

    expect(result.response).toMatchObject({
      accountsChecked: 2,
      propertiesChecked: 0,
      fetchedCount: 0,
      overallSuccess: false,
    });
    expect(result.response.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "CHANNEX_ACCOUNT_NOT_CONNECTED" }),
        expect.objectContaining({ code: "CHANNEX_RECONNECT_REQUIRED" }),
      ])
    );
    expect(channexProviderClient.listBookingRevisionFeed).not.toHaveBeenCalled();
  });

  test("respects staging account and property allowlist environment variables", async () => {
    process.env.CHANNEX_BOOKING_POLL_ENABLED = "true";
    process.env.CHANNEX_BOOKING_POLL_ACCOUNT_IDS = "integration-account-allowed";
    process.env.CHANNEX_BOOKING_POLL_DOMITS_PROPERTY_IDS = "domits-property-allowed";
    const account = buildIntegrationAccount({
      id: "integration-account-allowed",
      userId: "user-1",
    });
    const skippedAccount = buildIntegrationAccount({
      id: "integration-account-skipped",
      userId: "user-2",
      credentialsRef: "channex-secret-2",
    });
    const { service, accounts, props, channexProviderClient } = createService({
      account,
      channelAccounts: [skippedAccount, account],
      propertyMappings: [
        buildPropertyMapping({
          domitsPropertyId: "domits-property-skipped",
          externalPropertyId: "external-property-skipped",
        }),
        buildPropertyMapping({
          domitsPropertyId: "domits-property-allowed",
        }),
      ],
      roomTypeMappings: [
        buildRoomTypeMapping({
          domitsPropertyId: "domits-property-allowed",
        }),
      ],
      ratePlanMappings: [
        buildRatePlanMapping({
          domitsPropertyId: "domits-property-allowed",
        }),
      ],
      propertyContext: buildPropertyContext({
        propertyId: "domits-property-allowed",
      }),
      feedRevisions: [buildFeedRevision()],
      existingRevision: null,
    });

    const result = await service.pollLatestChannexBookings();

    expect(accounts.listByChannel).toHaveBeenCalledWith("CHANNEX");
    expect(props.listByAccountId).toHaveBeenCalledTimes(1);
    expect(props.listByAccountId).toHaveBeenCalledWith("integration-account-allowed");
    expect(result.response).toMatchObject({
      enabled: true,
      accountsChecked: 2,
      propertiesChecked: 1,
      fetchedCount: 1,
      createdBookingCount: 1,
    });
    expect(channexProviderClient.listBookingRevisionFeed).toHaveBeenCalledTimes(1);
  });

  test("polling leaves missing mappings unacked", async () => {
    const { service, channexProviderClient, externalBookingImportRepository } = createService({
      account: buildIntegrationAccount({ userId: "user-1" }),
      roomTypeMappings: [],
      feedRevisions: [buildFeedRevision()],
      existingRevision: null,
    });

    const result = await service.pollLatestChannexBookings(buildEnabledPollOptions());

    expect(result.response).toMatchObject({
      fetchedCount: 1,
      rawPersistedCount: 1,
      skippedCount: 1,
      ackedCount: 0,
      unackedCount: 1,
      overallSuccess: false,
    });
    expect(result.response.warnings).toEqual([
      expect.objectContaining({ code: "CHANNEX_ROOM_TYPE_MAPPING_MISSING" }),
    ]);
    expect(externalBookingImportRepository.createExternalBooking).not.toHaveBeenCalled();
    expect(channexProviderClient.acknowledgeBookingRevision).not.toHaveBeenCalled();
  });

  test("duplicate polling does not create duplicate Domits bookings", async () => {
    const { service, externalBookingImportRepository } = createService({
      account: buildIntegrationAccount({ userId: "user-1" }),
      feedRevisions: [buildFeedRevision()],
      existingRevision: null,
    });

    const firstResult = await service.pollLatestChannexBookings(buildEnabledPollOptions());
    const secondResult = await service.pollLatestChannexBookings(buildEnabledPollOptions());

    expect(firstResult.response.createdBookingCount).toBe(1);
    expect(secondResult.response.createdBookingCount).toBe(0);
    expect(secondResult.response.items[0]).toEqual(
      expect.objectContaining({
        result: "already-imported-and-acked",
        createdBooking: false,
      })
    );
    expect(externalBookingImportRepository.createExternalBooking).toHaveBeenCalledTimes(1);
  });

  test("lock skips overlapping property processing", async () => {
    const sync = {
      tryAcquireLock: jest.fn().mockResolvedValue({ acquired: false }),
      releaseLock: jest.fn(),
      insertLog: jest.fn(async (row) => row),
    };
    const { service, channexProviderClient } = createService({
      account: buildIntegrationAccount({ userId: "user-1" }),
      sync,
      feedRevisions: [buildFeedRevision()],
    });

    const result = await service.pollLatestChannexBookings(buildEnabledPollOptions());

    expect(result.response).toMatchObject({
      propertiesChecked: 1,
      propertiesSkippedCount: 1,
      fetchedCount: 0,
      overallSuccess: false,
    });
    expect(result.response.propertyResults[0]).toEqual(
      expect.objectContaining({
        result: "skipped-locked",
        warnings: [expect.objectContaining({ code: "CHANNEX_BOOKING_POLL_LOCKED" })],
      })
    );
    expect(channexProviderClient.listBookingRevisionFeed).not.toHaveBeenCalled();
    expect(sync.releaseLock).not.toHaveBeenCalled();
    expect(sync.insertLog).toHaveBeenCalledWith(
      expect.objectContaining({
        syncType: "booking_poll",
        status: "SKIPPED",
      })
    );
  });

  test("stale lock threshold is passed to the sync repository and can be reclaimed", async () => {
    const sync = {
      tryAcquireLock: jest.fn().mockResolvedValue({ acquired: true }),
      releaseLock: jest.fn().mockResolvedValue(null),
      insertLog: jest.fn(async (row) => row),
    };
    const { service } = createService({
      account: buildIntegrationAccount({ userId: "user-1" }),
      sync,
      feedRevisions: [buildFeedRevision()],
      existingRevision: null,
    });

    const result = await service.pollLatestChannexBookings({
      ...buildEnabledPollOptions(),
      lockStaleMs: 1234,
    });

    expect(result.response.createdBookingCount).toBe(1);
    expect(sync.tryAcquireLock).toHaveBeenCalledWith(
      "integration-account-1",
      "booking_poll:domits-property-1",
      expect.objectContaining({
        staleBeforeMs: expect.any(Number),
      })
    );
    const staleBeforeMs = sync.tryAcquireLock.mock.calls[0][2].staleBeforeMs;
    expect(Date.now() - staleBeforeMs).toBeGreaterThanOrEqual(1234);
  });

  test("failure for one property does not stop polling another property", async () => {
    const propertyMappings = [
      buildPropertyMapping(),
      buildPropertyMapping({
        domitsPropertyId: "domits-property-2",
        externalPropertyId: "external-property-2",
      }),
    ];
    const roomTypeMappings = propertyMappings.map((mapping) =>
      buildRoomTypeMapping({
        domitsPropertyId: mapping.domitsPropertyId,
        externalPropertyId: mapping.externalPropertyId,
      })
    );
    const ratePlanMappings = propertyMappings.map((mapping) =>
      buildRatePlanMapping({
        domitsPropertyId: mapping.domitsPropertyId,
        externalPropertyId: mapping.externalPropertyId,
      })
    );
    const { service, channexProviderClient } = createService({
      account: buildIntegrationAccount({ userId: "user-1" }),
      propertyMappings,
      roomTypeMappings,
      ratePlanMappings,
      existingRevision: null,
    });
    channexProviderClient.listBookingRevisionFeed.mockImplementation(async (_secret, { externalPropertyId }) => {
      if (externalPropertyId === "external-property-1") {
        throw new Error("provider timeout");
      }
      return {
        success: true,
        providerStatus: "ACTIVE",
        revisions: [
          buildFeedRevision({
            revisionId: "revision-new-2",
            bookingId: "booking-ota-2",
            uniqueId: "unique-ota-2",
            propertyId: "external-property-2",
          }),
        ],
      };
    });

    const result = await service.pollLatestChannexBookings(
      buildEnabledPollOptions({
        domitsPropertyIds: ["domits-property-1", "domits-property-2"],
      })
    );

    expect(result.statusCode).toBe(200);
    expect(result.response).toMatchObject({
      propertiesChecked: 2,
      fetchedCount: 1,
      createdBookingCount: 1,
      ackedCount: 1,
      overallSuccess: false,
    });
    expect(result.response.propertyResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ domitsPropertyId: "domits-property-1", result: "failed" }),
        expect.objectContaining({ domitsPropertyId: "domits-property-2", result: "processed" }),
      ])
    );
    expect(channexProviderClient.listBookingRevisionFeed).toHaveBeenCalledTimes(2);
  });
});
