jest.mock(
  "@aws-sdk/client-secrets-manager",
  () => require("./integrationService.secretsManagerMock.js"),
  { virtual: true }
);

const IntegrationService = require("./integrationService.js").default;

const createService = (channexDiagnosticsService) =>
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
    channexFullSyncService: {},
    channexCertificationService: {},
    channexDiagnosticsService,
    channexBookingRevisionImportService: {},
    channexAvailabilitySyncService: {},
    channexBookingPollingService: {},
  });

describe("IntegrationService Channex diagnostics delegation", () => {
  test.each([
    ["formatChannexEvidenceRow", [{ id: "evidence-1" }]],
    ["formatChannexEvidenceLatestSummary", [{ id: "evidence-1" }]],
    ["persistChannexSyncEvidence", [{ userId: "user-1", syncType: "ari" }]],
    [
      "finalizeChannexSyncResult",
      [{ statusCode: 200, response: {} }, { userId: "user-1" }, { skipEvidence: true }],
    ],
    ["listChannexSyncEvidence", ["user-1", { limit: 10 }]],
    ["getChannexSyncEvidence", ["user-1", "evidence-1"]],
    ["getLatestChannexSyncEvidenceSummary", ["user-1", "property-1"]],
  ])("%s delegates to the shared diagnostics service", async (methodName, args) => {
    const expected = { delegated: methodName };
    const channexDiagnosticsService = {
      [methodName]: jest.fn().mockReturnValue(expected),
    };
    const service = createService(channexDiagnosticsService);

    await expect(Promise.resolve(service[methodName](...args))).resolves.toBe(expected);
    expect(channexDiagnosticsService[methodName]).toHaveBeenCalledWith(...args);
  });
});
