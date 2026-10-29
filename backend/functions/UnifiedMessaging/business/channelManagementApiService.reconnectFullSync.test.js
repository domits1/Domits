jest.mock(
  "@aws-sdk/client-secrets-manager",
  () => require("./integrationService.secretsManagerMock.js"),
  { virtual: true }
);

const ChannelManagementApiService =
  require("../.shared/channelManagement/channelManagementApiService.js").default;

const connectedAnswer = { statusCode: 200, response: { connected: true, validationState: "CONNECTED" } };
const rejectedAnswer = { statusCode: 200, response: { connected: false, validationState: "RECONNECT_REQUIRED" } };

const mapping = (domitsPropertyId, status = "ACTIVE") => ({ domitsPropertyId, status, externalPropertyId: `channex-${domitsPropertyId}` });

const buildService = ({ previousStatus, connectAnswer = connectedAnswer, mappings = [mapping("property-1")] }) => {
  const accounts = {
    findByUserIdAndChannel: jest.fn(async () =>
      previousStatus ? { id: "account-1", userId: "host-1", channel: "CHANNEX", status: previousStatus } : null
    ),
  };
  const props = { listByAccountId: jest.fn(async () => mappings) };
  const service = new ChannelManagementApiService({ accounts, props });
  service.channelManagementService.connectChannex = jest.fn(async () => connectAnswer);
  service.channexMappingService.queueGoLiveFullSync = jest.fn(async () => true);
  return { service, props, queueGoLiveFullSync: service.channexMappingService.queueGoLiveFullSync };
};

// Changes made while an account was not connected were skipped, not sent. A new key therefore
// starts with the complete current state of every mapped property (#3572).
describe("ChannelManagementApiService.connectChannex full sync after reconnecting", () => {
  test.each(["RECONNECT_REQUIRED", "DISCONNECTED"])(
    "queues a full sync for every active mapping when a %s account is connected again",
    async (previousStatus) => {
      const { service, props, queueGoLiveFullSync } = buildService({
        previousStatus,
        mappings: [mapping("property-1"), mapping("property-2")],
      });

      const result = await service.connectChannex({ userId: "host-1" });

      expect(props.listByAccountId).toHaveBeenCalledWith("account-1");
      expect(queueGoLiveFullSync.mock.calls).toEqual([["property-1"], ["property-2"]]);
      expect(result).toMatchObject({ statusCode: 200, response: { connected: true, fullSyncQueuedCount: 2 } });
    }
  );

  test("skips mappings that are not active", async () => {
    const { service, queueGoLiveFullSync } = buildService({
      previousStatus: "RECONNECT_REQUIRED",
      mappings: [mapping("property-1"), mapping("property-2", "INACTIVE")],
    });

    const result = await service.connectChannex({ userId: "host-1" });

    expect(queueGoLiveFullSync.mock.calls).toEqual([["property-1"]]);
    expect(result.response.fullSyncQueuedCount).toBe(1);
  });

  test("queues nothing when the account was already connected", async () => {
    const { service, queueGoLiveFullSync } = buildService({ previousStatus: "CONNECTED" });

    const result = await service.connectChannex({ userId: "host-1" });

    expect(queueGoLiveFullSync).not.toHaveBeenCalled();
    expect(result.response.fullSyncQueuedCount).toBe(0);
  });

  test("queues nothing when the new key is not accepted either", async () => {
    const { service, queueGoLiveFullSync } = buildService({
      previousStatus: "RECONNECT_REQUIRED",
      connectAnswer: rejectedAnswer,
    });

    const result = await service.connectChannex({ userId: "host-1" });

    expect(queueGoLiveFullSync).not.toHaveBeenCalled();
    expect(result.response.fullSyncQueuedCount).toBe(0);
  });

  // A first connection has no mappings yet; saving a mapping queues its own full sync.
  test("queues nothing for a first connection", async () => {
    const { service, props, queueGoLiveFullSync } = buildService({ previousStatus: null });

    await service.connectChannex({ userId: "host-1" });

    expect(props.listByAccountId).not.toHaveBeenCalled();
    expect(queueGoLiveFullSync).not.toHaveBeenCalled();
  });
});
