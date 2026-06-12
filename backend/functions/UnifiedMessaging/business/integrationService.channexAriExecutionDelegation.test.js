jest.mock(
  "@aws-sdk/client-secrets-manager",
  () => require("./integrationService.secretsManagerMock.js"),
  { virtual: true }
);

const IntegrationService = require("./integrationService.js").default;

const createService = (channexAriExecutionService) =>
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
    channexAriPayloadService: {},
    channexAriExecutionService,
    channexBookingRevisionImportService: {},
    channexAvailabilitySyncService: {},
    channexBookingPollingService: {},
  });

describe("IntegrationService Channex ARI execution delegation", () => {
  test.each([
    [
      "resolveChannexSyncCredentialContext",
      [{ userId: "user-1", mappingSnapshot: {} }],
    ],
    [
      "createChannexSyncFinalizer",
      [{ normalizedUserId: "user-1", syncType: "restrictions" }],
    ],
    [
      "syncChannexAvailability",
      ["user-1", "property-1", "2026-06-01", "2026-06-02", { skipEvidence: true }],
    ],
    [
      "syncChannexRestrictions",
      ["user-1", "property-1", "2026-06-01", "2026-06-02", { skipEvidence: true }],
    ],
  ])("%s delegates to the shared ARI execution service", async (methodName, args) => {
    const expected = { delegated: methodName };
    const channexAriExecutionService = {
      [methodName]: jest.fn().mockResolvedValue(expected),
    };
    const service = createService(channexAriExecutionService);

    await expect(service[methodName](...args)).resolves.toBe(expected);
    expect(channexAriExecutionService[methodName]).toHaveBeenCalledWith(...args);
  });
});
