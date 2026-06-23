jest.mock(
  "@aws-sdk/client-secrets-manager",
  () => require("./integrationService.secretsManagerMock.js"),
  { virtual: true }
);

const IntegrationService = require("./integrationService.js").default;

describe("IntegrationService Channex booking polling delegation", () => {
  test("delegates polling to the shared polling service", async () => {
    const options = { enabled: true, trigger: "EVENTBRIDGE_POLL" };
    const expected = { statusCode: 200, response: { delegated: true } };
    const channexBookingPollingService = {
      pollLatestChannexBookings: jest.fn().mockResolvedValue(expected),
    };
    const service = new IntegrationService({
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
      channexBookingPollingService,
    });

    await expect(service.pollLatestChannexBookings(options)).resolves.toBe(expected);
    expect(channexBookingPollingService.pollLatestChannexBookings).toHaveBeenCalledWith(options);
  });
});
