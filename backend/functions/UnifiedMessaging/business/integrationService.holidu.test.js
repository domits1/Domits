jest.mock(
  "@aws-sdk/client-secrets-manager",
  () => ({
    SecretsManagerClient: class {
      send() {
        return Promise.resolve({});
      }
    },
    CreateSecretCommand: class {},
    PutSecretValueCommand: class {},
    GetSecretValueCommand: class {},
    DescribeSecretCommand: class {},
    DeleteSecretCommand: class {},
  }),
  { virtual: true }
);

const IntegrationService = require("./integrationService.js").default;

const buildAccountsMock = (overrides = {}) => ({
  findByUserIdAndChannel: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  disconnect: jest.fn(),
  ...overrides,
});

const buildSyncMock = (overrides = {}) => ({
  ensureStateRow: jest.fn(),
  ...overrides,
});

const buildHoliduStoreMock = (overrides = {}) => ({
  ensureSecret: jest.fn(),
  writeSecret: jest.fn(),
  readSecretOrNull: jest.fn(),
  ...overrides,
});

const buildProviderClientMock = (overrides = {}) => ({
  validateAccount: jest.fn(),
  ...overrides,
});

const createService = ({ accounts, sync, holiduCredentialStore, holiduProviderClient }) =>
  new IntegrationService({
    accounts,
    sync,
    holiduCredentialStore,
    holiduProviderClient,
    props: {},
    resLinks: {},
    runner: {},
    credentialStore: {},
  });

describe("IntegrationService Holidu provider validation", () => {
  test("connect with valid local credentials but unsupported provider validation does not mark CONNECTED", async () => {
    const accounts = buildAccountsMock({
      findByUserIdAndChannel: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(async (row) => row),
    });
    const sync = buildSyncMock();
    const holiduCredentialStore = buildHoliduStoreMock({
      ensureSecret: jest.fn().mockResolvedValue("domits/holidu/user-1/integration-1"),
      writeSecret: jest.fn().mockResolvedValue("domits/holidu/user-1/integration-1"),
    });
    const holiduProviderClient = buildProviderClientMock({
      validateAccount: jest.fn().mockResolvedValue({
        success: false,
        canValidate: false,
        providerStatus: "UNSUPPORTED_IN_REPO_DOCS",
        externalAccountId: null,
        errorCode: null,
        errorMessage: "No verified Holidu contract in repo/docs.",
      }),
    });

    const service = createService({ accounts, sync, holiduCredentialStore, holiduProviderClient });
    const result = await service.connectHolidu({
      userId: "user-1",
      displayName: "Holidu",
      credentials: { apiKey: "secret-key" },
    });

    expect(result.statusCode).toBe(200);
    expect(result.response.connected).toBe(false);
    expect(result.response.validationState).toBe("PENDING_PROVIDER_VALIDATION");
    expect(result.response.integration.status).toBe("PENDING_PROVIDER_VALIDATION");
    expect(accounts.create).toHaveBeenCalledWith(expect.objectContaining({ status: "PENDING_PROVIDER_VALIDATION" }));
  });

  test("connect with provider validation success marks CONNECTED", async () => {
    const accounts = buildAccountsMock({
      findByUserIdAndChannel: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(async (row) => row),
    });
    const sync = buildSyncMock();
    const holiduCredentialStore = buildHoliduStoreMock({
      ensureSecret: jest.fn().mockResolvedValue("domits/holidu/user-1/integration-1"),
      writeSecret: jest.fn().mockResolvedValue("domits/holidu/user-1/integration-1"),
    });
    const holiduProviderClient = buildProviderClientMock({
      validateAccount: jest.fn().mockResolvedValue({
        success: true,
        canValidate: true,
        providerStatus: "VALIDATED",
        externalAccountId: "holidu-account-123",
        errorCode: null,
        errorMessage: null,
      }),
    });

    const service = createService({ accounts, sync, holiduCredentialStore, holiduProviderClient });
    const result = await service.connectHolidu({
      userId: "user-1",
      credentials: { clientId: "client", clientSecret: "secret" },
    });

    expect(result.statusCode).toBe(200);
    expect(result.response.connected).toBe(true);
    expect(result.response.validationState).toBe("CONNECTED");
    expect(result.response.integration.status).toBe("CONNECTED");
    expect(result.response.integration.externalAccountId).toBe("holidu-account-123");
  });

  test("connect with provider validation failure marks VALIDATION_FAILED", async () => {
    const accounts = buildAccountsMock({
      findByUserIdAndChannel: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(async (row) => row),
    });
    const sync = buildSyncMock();
    const holiduCredentialStore = buildHoliduStoreMock({
      ensureSecret: jest.fn().mockResolvedValue("domits/holidu/user-1/integration-1"),
      writeSecret: jest.fn().mockResolvedValue("domits/holidu/user-1/integration-1"),
    });
    const holiduProviderClient = buildProviderClientMock({
      validateAccount: jest.fn().mockResolvedValue({
        success: false,
        canValidate: true,
        providerStatus: "INVALID_CREDENTIALS",
        externalAccountId: null,
        errorCode: "HOLIDU_INVALID_CREDENTIALS",
        errorMessage: "Provider rejected supplied credentials.",
      }),
    });

    const service = createService({ accounts, sync, holiduCredentialStore, holiduProviderClient });
    const result = await service.connectHolidu({
      userId: "user-1",
      credentials: { apiKey: "secret-key" },
    });

    expect(result.statusCode).toBe(200);
    expect(result.response.connected).toBe(false);
    expect(result.response.validationState).toBe("VALIDATION_FAILED");
    expect(result.response.integration.status).toBe("VALIDATION_FAILED");
    expect(result.response.integration.lastErrorCode).toBe("HOLIDU_INVALID_CREDENTIALS");
  });

  test("status without row returns NOT_CONNECTED", async () => {
    const accounts = buildAccountsMock({
      findByUserIdAndChannel: jest.fn().mockResolvedValue(null),
    });
    const service = createService({
      accounts,
      sync: buildSyncMock(),
      holiduCredentialStore: buildHoliduStoreMock(),
      holiduProviderClient: buildProviderClientMock(),
    });

    const result = await service.checkHoliduStatus("user-1");

    expect(result.statusCode).toBe(200);
    expect(result.response.status).toBe("NOT_CONNECTED");
  });

  test("status with missing secret returns RECONNECT_REQUIRED", async () => {
    const accounts = buildAccountsMock({
      findByUserIdAndChannel: jest.fn().mockResolvedValue({
        id: "integration-1",
        userId: "user-1",
        channel: "HOLIDU",
        displayName: "Holidu",
        externalAccountId: null,
        status: "PENDING_PROVIDER_VALIDATION",
        credentialsRef: "domits/holidu/user-1/integration-1",
      }),
    });
    const holiduCredentialStore = buildHoliduStoreMock({
      readSecretOrNull: jest.fn().mockResolvedValue(null),
    });
    const service = createService({
      accounts,
      sync: buildSyncMock(),
      holiduCredentialStore,
      holiduProviderClient: buildProviderClientMock(),
    });

    const result = await service.checkHoliduStatus("user-1");

    expect(result.statusCode).toBe(200);
    expect(result.response.status).toBe("RECONNECT_REQUIRED");
  });

  test("disconnect after existing connect returns DISCONNECTED", async () => {
    const accounts = buildAccountsMock({
      findByUserIdAndChannel: jest.fn().mockResolvedValue({
        id: "integration-1",
        userId: "user-1",
        channel: "HOLIDU",
        status: "PENDING_PROVIDER_VALIDATION",
        credentialsRef: "domits/holidu/user-1/integration-1",
      }),
      disconnect: jest.fn().mockResolvedValue({
        id: "integration-1",
        status: "DISCONNECTED",
      }),
    });
    const service = createService({
      accounts,
      sync: buildSyncMock(),
      holiduCredentialStore: buildHoliduStoreMock(),
      holiduProviderClient: buildProviderClientMock(),
    });

    const result = await service.disconnectHolidu({ userId: "user-1" });

    expect(result.statusCode).toBe(200);
    expect(result.response.status).toBe("DISCONNECTED");
    expect(result.response.disconnected).toBe(true);
  });
});
