jest.mock(
  "@aws-sdk/client-secrets-manager",
  () => require("./integrationService.secretsManagerMock.js"),
  { virtual: true }
);

const ChannexBookingPollingService =
  require("../.shared/channelManagement/services/channexBookingPollingService.js").default;

describe("ChannexBookingPollingService", () => {
  afterEach(() => {
    delete process.env.CHANNEX_BOOKING_POLL_ENABLED;
  });

  test("is importable without UnifiedMessaging and remains disabled by default", async () => {
    const accounts = {
      listByChannel: jest.fn(),
    };
    const service = new ChannexBookingPollingService({
      accounts,
      props: {},
      sync: {},
      channexCredentialStore: {},
      pullLatestChannexBookingsForResolvedContext: jest.fn(),
    });

    const result = await service.pollLatestChannexBookings();

    expect(result).toEqual({
      statusCode: 200,
      response: expect.objectContaining({
        enabled: false,
        calledProvider: false,
        accountsChecked: 0,
        propertiesChecked: 0,
        overallSuccess: true,
      }),
    });
    expect(accounts.listByChannel).not.toHaveBeenCalled();
  });
});
