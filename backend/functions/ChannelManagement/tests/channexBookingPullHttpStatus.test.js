import ChannexBookingRevisionImportService from "../../.shared/channelManagement/services/channexBookingRevisionImportService.js";

const INTEGRATION = { id: "account-1" };
const PROPERTY_MAPPING = { externalPropertyId: "channex-1" };

const buildService = ({ feedResult, ackResult } = {}) =>
  new ChannexBookingRevisionImportService({
    roomTypes: { listByAccountId: jest.fn(async () => []) },
    ratePlans: { listByAccountId: jest.fn(async () => []) },
    externalBookingImportRepository: { getDomitsPropertyContext: jest.fn(async () => ({})) },
    channexBookingRevisions: {
      getByIntegrationAccountIdAndRevisionId: jest.fn(async () => ({
        domitsPropertyId: "property-1",
        externalPropertyId: "channex-1",
        acknowledgementState: "PENDING",
      })),
    },
    channexProviderClient: {
      listBookingRevisionFeed: jest.fn(async () => feedResult),
      acknowledgeBookingRevision: jest.fn(async () => ackResult),
    },
    finalizeChannexSyncResult: async (result) => result,
  });

// The booking webhook decides between "retry" and "done" on the HTTP status, so it has to survive
// the import service's own error shapes on the way to the webhook.
describe("Channex booking pull keeps the HTTP status of provider failures", () => {
  test("an acknowledgement failure carries the HTTP status", async () => {
    const service = buildService({
      ackResult: { success: false, httpStatus: 503, errorCode: "SERVICE_UNAVAILABLE", errorMessage: "Down." },
    });

    const result = await service.acknowledgeImportedChannexBookingRevision({
      revisionId: "revision-1",
      secret: {},
      integration: INTEGRATION,
      normalizedDomitsPropertyId: "property-1",
      propertyMapping: PROPERTY_MAPPING,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toMatchObject({ code: "SERVICE_UNAVAILABLE", stage: "ack", httpStatus: 503 });
  });

  test("a failure before Channex was called carries a null HTTP status", async () => {
    const service = buildService();
    service.channexBookingRevisions.getByIntegrationAccountIdAndRevisionId.mockResolvedValue(null);

    const result = await service.acknowledgeImportedChannexBookingRevision({
      revisionId: "revision-1",
      secret: {},
      integration: INTEGRATION,
      normalizedDomitsPropertyId: "property-1",
      propertyMapping: PROPERTY_MAPPING,
    });

    expect(result.error).toMatchObject({ stage: "local_lookup", httpStatus: null });
  });

  test("a feed failure carries the HTTP status in the pull response", async () => {
    const service = buildService({
      feedResult: { success: false, revisions: [], httpStatus: 429, providerStatus: "BOOKING_FEED_FAILED" },
    });

    const result = await service.pullLatestChannexBookingsForResolvedContext({
      normalizedUserId: "user-1",
      normalizedDomitsPropertyId: "property-1",
      integration: INTEGRATION,
      propertyMapping: PROPERTY_MAPPING,
      secret: {},
    });

    expect(result.statusCode).toBe(502);
    expect(result.response).toMatchObject({ providerStatus: "BOOKING_FEED_FAILED", httpStatus: 429 });
  });
});
