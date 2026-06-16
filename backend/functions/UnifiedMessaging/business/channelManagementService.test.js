jest.mock(
  "@aws-sdk/client-secrets-manager",
  () => require("./integrationService.secretsManagerMock.js"),
  { virtual: true }
);

const ChannelManagementService =
  require("../.shared/channelManagement/channelManagementService.js").default;

describe("ChannelManagementService provider lifecycle", () => {
  test("connects Channex through shared dependencies without UnifiedMessaging", async () => {
    const accounts = {
      findByUserIdAndChannel: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(async (row) => row),
    };
    const sync = {
      ensureStateRow: jest.fn(),
    };
    const channexCredentialStore = {
      ensureSecret: jest.fn().mockResolvedValue("domits/channex/user-1/integration-1"),
      writeSecret: jest.fn(),
    };
    const channexProviderClient = {
      validateApiKey: jest.fn().mockResolvedValue({
        success: true,
        providerStatus: "ACTIVE",
        externalAccountId: "channex-account-1",
      }),
    };
    const service = new ChannelManagementService({
      accounts,
      sync,
      holiduCredentialStore: {},
      holiduProviderClient: {},
      channexCredentialStore,
      channexProviderClient,
    });

    const result = await service.connectChannex({
      userId: "user-1",
      credentials: { apiKey: "secret-key" },
    });

    expect(result).toEqual({
      statusCode: 200,
      response: expect.objectContaining({
        connected: true,
        channel: "CHANNEX",
        validationState: "CONNECTED",
        providerStatus: "ACTIVE",
        accountPolicy: "SINGLE_ACCOUNT_PER_USER",
      }),
    });
    expect(result.response.integration).not.toHaveProperty("credentialsRef");
    expect(channexProviderClient.validateApiKey).toHaveBeenCalledWith({ apiKey: "secret-key" });
  });
});
