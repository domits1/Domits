jest.mock(
  "@aws-sdk/client-secrets-manager",
  () => require("./integrationService.secretsManagerMock.js"),
  { virtual: true }
);

const IntegrationService = require("./integrationService.js").default;

const createService = (channelManagementService) =>
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
    channelManagementService,
  });

describe("IntegrationService ChannelManagement delegation", () => {
  test.each([
    ["connectHolidu", [{ userId: "user-1" }]],
    ["checkHoliduStatus", ["user-1"]],
    ["disconnectHolidu", [{ userId: "user-1" }]],
    ["connectChannex", [{ userId: "user-1" }]],
    ["checkChannexStatus", ["user-1"]],
    ["disconnectChannex", [{ userId: "user-1" }]],
  ])("%s delegates to ChannelManagementService", async (methodName, args) => {
    const expected = { statusCode: 200, response: { delegated: methodName } };
    const channelManagementService = {
      [methodName]: jest.fn().mockResolvedValue(expected),
    };
    const service = createService(channelManagementService);

    await expect(service[methodName](...args)).resolves.toBe(expected);
    expect(channelManagementService[methodName]).toHaveBeenCalledWith(...args);
  });
});
