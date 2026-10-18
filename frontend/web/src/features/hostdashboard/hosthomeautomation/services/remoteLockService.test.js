import {
  MOCK_STATUS,
  connectRemoteLock,
  disconnectRemoteLock,
  getRemoteLockDevices,
  getRemoteLockStatus,
  resetMockRemoteLock,
  setMockRemoteLockStatus,
} from "./remoteLockService";

beforeEach(resetMockRemoteLock);

describe("remoteLockService (mock)", () => {
  it("starts as NOT_CONNECTED with nothing synced", async () => {
    expect(MOCK_STATUS).toBe("NOT_CONNECTED");
    expect(await getRemoteLockStatus()).toEqual({ status: "NOT_CONNECTED", lastSyncAt: null });
  });

  it("returns a last sync time once connected", async () => {
    setMockRemoteLockStatus("CONNECTED");

    const result = await getRemoteLockStatus();

    expect(result.status).toBe("CONNECTED");
    expect(Number.isFinite(result.lastSyncAt)).toBe(true);
  });

  it("keeps the status it was given until it is reset", async () => {
    setMockRemoteLockStatus("EXPIRED_CREDENTIALS");
    expect((await getRemoteLockStatus()).status).toBe("EXPIRED_CREDENTIALS");

    resetMockRemoteLock();
    expect((await getRemoteLockStatus()).status).toBe("NOT_CONNECTED");
  });

  it("connects: resolves CONNECTED with a sync time, and the next status read agrees", async () => {
    const result = await connectRemoteLock();

    expect(result.status).toBe("CONNECTED");
    expect(Number.isFinite(result.lastSyncAt)).toBe(true);
    expect(await getRemoteLockStatus()).toEqual(result);
  });

  it("disconnects: resolves DISCONNECTED with no sync time, and the next status read agrees", async () => {
    setMockRemoteLockStatus("CONNECTED");

    const result = await disconnectRemoteLock();

    expect(result).toEqual({ status: "DISCONNECTED", lastSyncAt: null });
    expect(await getRemoteLockStatus()).toEqual(result);
  });

  it("lists devices that use RemoteLock's type values and cover the cases the page must handle", async () => {
    const devices = await getRemoteLockDevices();

    expect(devices.map((device) => device.type).sort()).toEqual(
      ["connector_lock", "lock", "resort_lock", "schlage_home_lock", "zwave_lock"].sort()
    );
    expect(new Set(devices.map((device) => device.status))).toEqual(new Set(["ONLINE", "OFFLINE", "UNKNOWN"]));
    expect(devices.some((device) => device.battery === null)).toBe(true);
    expect(devices.some((device) => device.lastSeenAt === null)).toBe(true);
  });

  it("hands out copies, so a caller cannot change the next list", async () => {
    (await getRemoteLockDevices())[0].name = "changed";

    expect((await getRemoteLockDevices())[0].name).not.toBe("changed");
  });
});
