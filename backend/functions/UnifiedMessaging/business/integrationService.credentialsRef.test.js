jest.mock(
  "@aws-sdk/client-secrets-manager",
  () => require("./integrationService.secretsManagerMock.js"),
  { virtual: true }
);

const IntegrationService = require("./integrationService.js").default;

const buildAccountsMock = (overrides = {}) => ({
  create: jest.fn(),
  update: jest.fn(),
  ...overrides,
});

const buildSyncMock = (overrides = {}) => ({
  ensureStateRow: jest.fn(),
  ...overrides,
});

const createService = ({ accounts, sync }) =>
  new IntegrationService({
    accounts,
    sync,
    props: {},
    resLinks: {},
    runner: {},
    credentialStore: {},
  });

describe("IntegrationService ignores client-supplied credentialsRef", () => {
  test("createIntegration never stores a client-supplied credentialsRef", async () => {
    const accounts = buildAccountsMock({
      create: jest.fn().mockImplementation(async (row) => row),
    });
    const sync = buildSyncMock();
    const service = createService({ accounts, sync });

    await service.createIntegration({
      userId: "user-1",
      channel: "CHANNEX",
      credentialsRef: "client-supplied-ref",
    });

    expect(accounts.create).toHaveBeenCalledWith(expect.objectContaining({ credentialsRef: null }));
  });

  test("updateIntegration never forwards a client-supplied credentialsRef (existing ref is kept)", async () => {
    const accounts = buildAccountsMock({
      update: jest.fn().mockResolvedValue({
        id: "integration-1",
        displayName: "New name",
        credentialsRef: "existing-secret-ref",
      }),
    });
    const service = createService({ accounts, sync: buildSyncMock() });

    await service.updateIntegration("integration-1", {
      credentialsRef: "client-supplied-ref",
      displayName: "New name",
    });

    const [, patchArg] = accounts.update.mock.calls[0];
    expect(Object.hasOwn(patchArg, "credentialsRef")).toBe(false);
  });

  test("updateIntegration still applies other patch fields alongside an ignored credentialsRef", async () => {
    const accounts = buildAccountsMock({
      update: jest.fn().mockResolvedValue({
        id: "integration-1",
        displayName: "New name",
      }),
    });
    const service = createService({ accounts, sync: buildSyncMock() });

    await service.updateIntegration("integration-1", {
      credentialsRef: "client-supplied-ref",
      displayName: "New name",
    });

    const [, patchArg] = accounts.update.mock.calls[0];
    expect(patchArg.displayName).toBe("New name");
  });

  test("createIntegration response never echoes credentialsRef back to the caller", async () => {
    const accounts = buildAccountsMock({
      create: jest.fn().mockResolvedValue({
        id: "integration-1",
        userId: "user-1",
        channel: "CHANNEX",
        credentialsRef: "client-supplied-ref",
      }),
    });
    const sync = buildSyncMock();
    const service = createService({ accounts, sync });

    const result = await service.createIntegration({
      userId: "user-1",
      channel: "CHANNEX",
      credentialsRef: "client-supplied-ref",
    });

    expect(result.response).not.toHaveProperty("credentialsRef");
  });

  test("updateIntegration response never echoes credentialsRef back to the caller", async () => {
    const accounts = buildAccountsMock({
      update: jest.fn().mockResolvedValue({
        id: "integration-1",
        displayName: "New name",
        credentialsRef: "existing-secret-ref",
      }),
    });
    const service = createService({ accounts, sync: buildSyncMock() });

    const result = await service.updateIntegration("integration-1", { displayName: "New name" });

    expect(result.response).not.toHaveProperty("credentialsRef");
  });
});
