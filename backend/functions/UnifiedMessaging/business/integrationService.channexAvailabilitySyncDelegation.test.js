jest.mock(
  "@aws-sdk/client-secrets-manager",
  () => require("./integrationService.secretsManagerMock.js"),
  { virtual: true }
);

const IntegrationService = require("./integrationService.js").default;

const createService = (channexAvailabilitySyncService) =>
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
    channexBookingRevisionImportService: {},
    channexAvailabilitySyncService,
    channexBookingPollingService: {},
  });

describe("IntegrationService Channex availability sync delegation", () => {
  test.each([
    ["syncChannexBookingAvailability", [{ trigger: "BOOKING_CREATED" }]],
    [
      "syncChannexCalendarChange",
      [
        {
          userId: "user-1",
          domitsPropertyId: "property-1",
          changedDates: ["2026-06-10"],
          changeTypes: ["availability"],
        },
        { skipEvidence: true },
      ],
    ],
  ])("%s delegates to the shared availability sync service", async (methodName, args) => {
    const expected = { statusCode: 200, response: { delegated: methodName } };
    const channexAvailabilitySyncService = {
      [methodName]: jest.fn().mockResolvedValue(expected),
    };
    const service = createService(channexAvailabilitySyncService);

    await expect(service[methodName](...args)).resolves.toBe(expected);
    expect(channexAvailabilitySyncService[methodName]).toHaveBeenCalledWith(...args);
  });
});
