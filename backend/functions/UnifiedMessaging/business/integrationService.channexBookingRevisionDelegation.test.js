jest.mock(
  "@aws-sdk/client-secrets-manager",
  () => require("./integrationService.secretsManagerMock.js"),
  { virtual: true }
);

const IntegrationService = require("./integrationService.js").default;

const createService = (channexBookingRevisionImportService, overrides = {}) =>
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
    channexBookingRevisionImportService,
    ...overrides,
  });

describe("IntegrationService Channex booking revision delegation", () => {
  test.each([
    ["listChannexBookingRevisions", ["user-1", { domitsPropertyId: "property-1" }]],
    ["receiveChannexBookingRevisions", ["user-1", "property-1", { skipEvidence: true }]],
    ["pullLatestChannexBookings", ["user-1", "property-1", { skipEvidence: true }]],
    [
      "acknowledgeChannexBookingRevisions",
      ["user-1", "property-1", { revisionIds: ["revision-1"] }, { skipEvidence: true }],
    ],
  ])("%s delegates to the shared revision import service", async (methodName, args) => {
    const expected = { statusCode: 200, response: { delegated: methodName } };
    const channexBookingRevisionImportService = {
      [methodName]: jest.fn().mockResolvedValue(expected),
    };
    const service = createService(channexBookingRevisionImportService, {
      channexBookingPollingService: {},
    });

    await expect(service[methodName](...args)).resolves.toBe(expected);
    expect(channexBookingRevisionImportService[methodName]).toHaveBeenCalledWith(...args);
  });

  test("wires polling to the extracted resolved-context pull method", async () => {
    const context = { normalizedUserId: "user-1", normalizedDomitsPropertyId: "property-1" };
    const expected = { statusCode: 200, response: { delegated: true } };
    const channexBookingRevisionImportService = {
      pullLatestChannexBookingsForResolvedContext: jest.fn().mockResolvedValue(expected),
    };
    const service = createService(channexBookingRevisionImportService);

    await expect(
      service.channexBookingPollingService.pullLatestChannexBookingsForResolvedContext(context)
    ).resolves.toBe(expected);
    expect(
      channexBookingRevisionImportService.pullLatestChannexBookingsForResolvedContext
    ).toHaveBeenCalledWith(context);
  });
});
