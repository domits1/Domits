jest.mock(
  "@aws-sdk/client-secrets-manager",
  () => require("./integrationService.secretsManagerMock.js"),
  { virtual: true }
);

const IntegrationService = require("./integrationService.js").default;

const createService = (channexFullSyncService) =>
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
    channexAriExecutionService: {},
    channexFullSyncService,
    channexBookingRevisionImportService: {},
    channexAvailabilitySyncService: {},
    channexBookingPollingService: {},
  });

describe("IntegrationService Channex full-sync delegation", () => {
  test("syncChannexFull delegates to the shared full-sync service", async () => {
    const expected = { statusCode: 200, response: { delegated: true } };
    const args = [
      "user-1",
      "property-1",
      "2026-06-01",
      "2026-06-02",
      { skipEvidence: true },
    ];
    const channexFullSyncService = {
      syncChannexFull: jest.fn().mockResolvedValue(expected),
    };
    const service = createService(channexFullSyncService);

    await expect(service.syncChannexFull(...args)).resolves.toBe(expected);
    expect(channexFullSyncService.syncChannexFull).toHaveBeenCalledWith(...args);
  });
});
