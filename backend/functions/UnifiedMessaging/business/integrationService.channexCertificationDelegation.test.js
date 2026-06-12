jest.mock(
  "@aws-sdk/client-secrets-manager",
  () => require("./integrationService.secretsManagerMock.js"),
  { virtual: true }
);

const IntegrationService = require("./integrationService.js").default;

const createService = (channexCertificationService) =>
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
    channexCertificationService,
    channexDiagnosticsService: {},
    channexBookingRevisionImportService: {},
    channexAvailabilitySyncService: {},
    channexBookingPollingService: {},
  });

describe("IntegrationService Channex certification delegation", () => {
  test.each([
    [
      "buildChannexCertificationCancelSkippedEvidence",
      [{ booking: { id: "booking-1" }, reason: "BOOKING_ALREADY_CANCELLED" }],
    ],
    [
      "cancelChannexCertificationBooking",
      ["admin-user", "property-1", { bookingId: "booking-1" }],
    ],
    [
      "buildChannexCertificationTestCasePayload",
      [{ readiness: {}, testCase: { payloadType: "availability", updates: [] } }],
    ],
    [
      "syncChannexCertificationTestCase",
      ["admin-user", "property-1", { testCaseId: "9" }, { skipEvidence: true }],
    ],
  ])("%s delegates to the shared certification service", async (methodName, args) => {
    const expected = { delegated: methodName };
    const channexCertificationService = {
      [methodName]: jest.fn().mockReturnValue(expected),
    };
    const service = createService(channexCertificationService);

    await expect(Promise.resolve(service[methodName](...args))).resolves.toBe(expected);
    expect(channexCertificationService[methodName]).toHaveBeenCalledWith(...args);
  });
});
