jest.mock(
  "@aws-sdk/client-secrets-manager",
  () => require("./integrationService.secretsManagerMock.js"),
  { virtual: true }
);

const IntegrationService = require("./integrationService.js").default;

const createService = (channexMappingService) =>
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
    channexMappingService,
    channexBookingRevisionImportService: {},
    channexAvailabilitySyncService: {},
    channexBookingPollingService: {},
  });

describe("IntegrationService Channex mapping delegation", () => {
  test.each([
    ["resolveUsableChannexIntegration", ["user-1", { requireSecret: true }]],
    ["listChannexProperties", ["user-1"]],
    ["listChannexRoomTypes", ["user-1", "external-property-1"]],
    ["listChannexRatePlans", ["user-1", "external-room-type-1"]],
    ["linkChannexProperty", ["user-1", { domitsPropertyId: "property-1" }]],
    ["linkChannexRoomType", ["user-1", { domitsPropertyId: "property-1" }]],
    ["linkChannexRatePlan", ["user-1", { domitsPropertyId: "property-1" }]],
    ["saveChannexSetupMapping", ["user-1", { domitsPropertyId: "property-1" }]],
    ["listLinkedChannexRoomTypes", ["user-1"]],
    ["listLinkedChannexRatePlans", ["user-1"]],
    ["getChannexAriTargets", ["user-1", "property-1"]],
  ])("%s delegates to the shared mapping service", async (methodName, args) => {
    const expected = { statusCode: 200, response: { delegated: methodName } };
    const channexMappingService = {
      [methodName]: jest.fn().mockResolvedValue(expected),
    };
    const service = createService(channexMappingService);

    await expect(service[methodName](...args)).resolves.toBe(expected);
    expect(channexMappingService[methodName]).toHaveBeenCalledWith(...args);
  });
});
