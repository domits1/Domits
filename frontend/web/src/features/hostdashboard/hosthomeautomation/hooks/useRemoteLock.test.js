import { act, renderHook, waitFor } from "@testing-library/react";
import { useRemoteLock } from "./useRemoteLock";
import { getRemoteLockStatus } from "../services/remoteLockService";

jest.mock("../services/remoteLockService");

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe("useRemoteLock", () => {
  it("is loading first, then returns the status and the last sync", async () => {
    getRemoteLockStatus.mockResolvedValue({ status: "CONNECTED", lastSyncAt: 123 });

    const { result } = renderHook(() => useRemoteLock());

    expect(result.current).toMatchObject({ loading: true, status: null, lastSyncAt: null, error: null });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current).toMatchObject({ status: "CONNECTED", lastSyncAt: 123, error: null });
  });

  it("returns the error message when the service rejects", async () => {
    getRemoteLockStatus.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useRemoteLock());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current).toMatchObject({ error: "boom", status: null });
  });

  it("reload fetches again and clears an earlier error", async () => {
    getRemoteLockStatus.mockRejectedValueOnce(new Error("boom"));
    getRemoteLockStatus.mockResolvedValueOnce({ status: "CONNECTED", lastSyncAt: null });
    const { result } = renderHook(() => useRemoteLock());
    await waitFor(() => expect(result.current.error).toBe("boom"));

    act(() => result.current.reload());

    await waitFor(() => expect(result.current.status).toBe("CONNECTED"));
    expect(result.current.error).toBeNull();
    expect(getRemoteLockStatus).toHaveBeenCalledTimes(2);
  });

  it("ignores an older response that arrives after a reload", async () => {
    const first = deferred();
    const second = deferred();
    getRemoteLockStatus.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result } = renderHook(() => useRemoteLock());

    act(() => result.current.reload());
    await act(async () => second.resolve({ status: "CONNECTED", lastSyncAt: 2 }));
    await act(async () => first.resolve({ status: "DISCONNECTED", lastSyncAt: 1 }));

    expect(result.current).toMatchObject({ status: "CONNECTED", lastSyncAt: 2, loading: false });
  });
});
