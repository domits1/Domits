jest.mock(
  "@aws-sdk/client-secrets-manager",
  () => require("./integrationService.secretsManagerMock.js"),
  { virtual: true }
);

const IntegrationService = require("./integrationService.js").default;

const createService = (channexAriPayloadService) =>
  new IntegrationService({
    accounts: {},
    props: {},
    ratePlans: {},
    roomTypes: {},
    sync: {},
    resLinks: {},
    channexEvidence: {},
    channexBookingRevisions: {},
    bookingAvailabilityRepository: {},
    externalBookingImportRepository: {},
    channexBookingAvailabilityBridge: {},
    runner: {},
    credentialStore: {},
    holiduCredentialStore: {},
    holiduProviderClient: {},
    channexCredentialStore: {},
    channexProviderClient: {},
    channelManagementService: {},
    channexMappingService: {},
    channexAriPayloadService,
    channexBookingRevisionImportService: {},
    channexAvailabilitySyncService: {},
    channexBookingPollingService: {},
  });

describe("IntegrationService Channex ARI payload delegation", () => {
  test.each([
    ["previewChannexAri", ["user-1", "property-1", "2026-06-01", "2026-06-02"]],
    [
      "previewChannexAriPayloads",
      [
        "user-1",
        "property-1",
        "2026-06-01",
        "2026-06-02",
        { paginate: true },
      ],
    ],
    [
      "previewChannexAvailabilityPayloads",
      ["user-1", "property-1", "2026-06-01", "2026-06-02"],
    ],
    [
      "previewChannexRestrictionRatePayloads",
      ["user-1", "property-1", "2026-06-01", "2026-06-02"],
    ],
    ["normalizeChannexFullSyncDateContext", ["2026-06-01", "2026-06-02"]],
    [
      "buildChannexFullSyncPayloadContext",
      [{ readiness: { ready: true }, normalizedDomitsPropertyId: "property-1" }],
    ],
    [
      "buildChannexFullSyncAvailabilityPayloadContext",
      [{ readiness: { ready: true }, normalizedDomitsPropertyId: "property-1" }],
    ],
    [
      "buildChannexFullSyncRestrictionsPayloadContext",
      [{ readiness: { ready: true }, normalizedDomitsPropertyId: "property-1" }],
    ],
  ])("%s delegates to the shared ARI payload service", async (methodName, args) => {
    const expected = { delegated: methodName };
    const channexAriPayloadService = {
      [methodName]: jest.fn().mockResolvedValue(expected),
    };
    const service = createService(channexAriPayloadService);

    await expect(service[methodName](...args)).resolves.toBe(expected);
    expect(channexAriPayloadService[methodName]).toHaveBeenCalledWith(...args);
  });
});
