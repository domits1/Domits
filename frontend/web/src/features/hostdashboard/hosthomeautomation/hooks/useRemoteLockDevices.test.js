import { act, renderHook, waitFor } from "@testing-library/react";
import { useRemoteLockDevices } from "./useRemoteLockDevices";
import { getRemoteLockDevices } from "../services/remoteLockService";

jest.mock("../services/remoteLockService");

const DEVICES = [{ id: "lock-1", name: "Front door" }];

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe("useRemoteLockDevices", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not fetch while it is not enabled", () => {
    const { result } = renderHook(() => useRemoteLockDevices(false));

    expect(getRemoteLockDevices).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({ devices: [], loading: false, error: null });
  });

  it("is loading from the first render when enabled, then returns the devices", async () => {
    getRemoteLockDevices.mockResolvedValue(DEVICES);

    const { result } = renderHook(() => useRemoteLockDevices(true));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current).toMatchObject({ devices: DEVICES, error: null });
  });

  it("fetches on every switch to enabled and forgets the list when disabled", async () => {
    getRemoteLockDevices.mockResolvedValue(DEVICES);
    const { result, rerender } = renderHook(({ enabled }) => useRemoteLockDevices(enabled), {
      initialProps: { enabled: false },
    });

    rerender({ enabled: true });
    await waitFor(() => expect(result.current.devices).toEqual(DEVICES));

    rerender({ enabled: false });
    await waitFor(() => expect(result.current.devices).toEqual([]));

    rerender({ enabled: true });
    await waitFor(() => expect(result.current.devices).toEqual(DEVICES));
    expect(getRemoteLockDevices).toHaveBeenCalledTimes(2);
  });

  it("ignores a response that arrives after it was disabled", async () => {
    const pending = deferred();
    getRemoteLockDevices.mockReturnValue(pending.promise);
    const { result, rerender } = renderHook(({ enabled }) => useRemoteLockDevices(enabled), {
      initialProps: { enabled: true },
    });

    rerender({ enabled: false });
    await act(async () => pending.resolve(DEVICES));

    expect(result.current).toMatchObject({ devices: [], loading: false });
  });

  it("returns the error message, stops loading, and retry fetches again", async () => {
    getRemoteLockDevices.mockRejectedValueOnce(new Error("boom"));
    getRemoteLockDevices.mockResolvedValueOnce(DEVICES);
    const { result } = renderHook(() => useRemoteLockDevices(true));

    await waitFor(() => expect(result.current.error).toBe("boom"));
    expect(result.current.loading).toBe(false);

    act(() => result.current.retry());

    await waitFor(() => expect(result.current.devices).toEqual(DEVICES));
    expect(result.current.error).toBeNull();
  });
});
