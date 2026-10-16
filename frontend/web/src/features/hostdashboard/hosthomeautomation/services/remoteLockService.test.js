import {
  MOCK_STATUS,
  connectRemoteLock,
  disconnectRemoteLock,
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
});
