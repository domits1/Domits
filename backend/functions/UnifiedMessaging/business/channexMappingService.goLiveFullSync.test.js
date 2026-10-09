jest.mock(
  "@aws-sdk/client-secrets-manager",
  () => require("./integrationService.secretsManagerMock.js"),
  { virtual: true }
);

const ChannexMappingService =
  require("../.shared/channelManagement/services/channexMappingService.js").default;

const body = {
  domitsPropertyId: "property-1",
  externalPropertyId: "external-property-1",
  externalRoomTypeId: "external-room-1",
  externalRatePlanId: "external-rate-1",
};

const buildService = ({ ready = true, enqueue = jest.fn().mockResolvedValue(true) } = {}) => {
  const saved = { upsert: jest.fn().mockResolvedValue({}) };
  const manager = { name: "transaction-manager" };
  const database = { transaction: jest.fn(async (work) => work(manager)) };
  const service = new ChannexMappingService({
    accounts: {
      findByUserIdAndChannel: jest.fn().mockResolvedValue({
        id: "integration-account-1",
        status: "CONNECTED",
        credentialsRef: "channex-secret-1",
      }),
    },
    props: saved,
    roomTypes: saved,
    ratePlans: saved,
    propertyLookup: {
      getDomitsPropertyContext: jest.fn().mockResolvedValue({ propertyId: "property-1", hostId: "user-1" }),
    },
    channexCredentialStore: {},
    channexProviderClient: {},
    channexAriOutboxWriter: { enqueueChannexFullSync: enqueue },
    getDatabase: jest.fn().mockResolvedValue(database),
  });
  service.getChannexAriTargets = jest.fn().mockResolvedValue({ statusCode: 200, response: { ready } });
  return { service, enqueue, database, manager };
};

// A property that goes live must start in Channex with its complete current state (#3282).
describe("ChannexMappingService.saveChannexSetupMapping go-live full sync", () => {
  test("queues one full sync in a transaction when the saved mapping is ready", async () => {
    const { service, enqueue, database, manager } = buildService();

    const result = await service.saveChannexSetupMapping("user-1", body);

    expect(result.statusCode).toBe(200);
    expect(result.response.fullSyncQueued).toBe(true);
    expect(database.transaction).toHaveBeenCalledTimes(1);
    expect(enqueue).toHaveBeenCalledWith(manager, { domitsPropertyId: "property-1" });
  });

  test("queues nothing while the mapping is not ready yet", async () => {
    const { service, enqueue } = buildService({ ready: false });

    const result = await service.saveChannexSetupMapping("user-1", body);

    expect(result.statusCode).toBe(200);
    expect(result.response.fullSyncQueued).toBe(false);
    expect(enqueue).not.toHaveBeenCalled();
  });

  // The mapping is already saved at that point; failing the save would hide that, and
  // saving the mapping again retries the full sync.
  test("still answers 200 with fullSyncQueued false when queueing fails", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    const { service } = buildService({ enqueue: jest.fn().mockRejectedValue(new Error("database down")) });

    const result = await service.saveChannexSetupMapping("user-1", body);

    expect(result.statusCode).toBe(200);
    expect(result.response.saved).toBe(true);
    expect(result.response.fullSyncQueued).toBe(false);
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining("CHANNEX_GO_LIVE_FULL_SYNC_QUEUE_FAILED"));
    consoleError.mockRestore();
  });
});
