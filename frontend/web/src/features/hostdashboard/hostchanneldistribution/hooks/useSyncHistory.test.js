import { act, renderHook, waitFor } from "@testing-library/react";
import { SYNC_HISTORY_STATE, useSyncHistory } from "./useSyncHistory";
import { getSyncHistory } from "../services/channexDistributionService";

jest.mock("../services/channexDistributionService");

const evidence = (id, overrides = {}) => ({
  id,
  syncType: "ari",
  status: "SUCCESS",
  overallSuccess: true,
  startedAt: 1758700000000,
  finishedAt: 1758700005000,
  warnings: [],
  errors: [],
  ...overrides,
});

const answer = (...items) => ({ channel: "CHANNEX", items });

const deferred = () => {
  let resolve;
  const promise = new Promise((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
};

describe("useSyncHistory", () => {
  let consoleError;

  beforeEach(() => {
    jest.resetAllMocks();
    consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    getSyncHistory.mockResolvedValue(answer(evidence("evidence-1")));
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  test("makes no request and stays idle until a property is selected", async () => {
    const { result } = renderHook(() => useSyncHistory({ domitsPropertyId: "" }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(getSyncHistory).not.toHaveBeenCalled();
    expect(result.current).toEqual({ rows: [], loadState: SYNC_HISTORY_STATE.IDLE });
  });

  test("is loading first, then exposes the rows of the selected property in the order received", async () => {
    getSyncHistory.mockResolvedValue(answer(evidence("new"), evidence("middle"), evidence("old")));

    const { result } = renderHook(() => useSyncHistory({ domitsPropertyId: "property-1" }));

    expect(result.current.loadState).toBe(SYNC_HISTORY_STATE.LOADING);
    await waitFor(() => expect(result.current.loadState).toBe(SYNC_HISTORY_STATE.LOADED));
    expect(result.current.rows.map((row) => row.id)).toEqual(["new", "middle", "old"]);
    expect(getSyncHistory).toHaveBeenCalledWith({ domitsPropertyId: "property-1" });
  });

  test("is loaded with no rows when the property has no syncs yet", async () => {
    getSyncHistory.mockResolvedValue(answer());

    const { result } = renderHook(() => useSyncHistory({ domitsPropertyId: "property-1" }));

    await waitFor(() => expect(result.current.loadState).toBe(SYNC_HISTORY_STATE.LOADED));
    expect(result.current.rows).toEqual([]);
  });

  test("keeps only what the card shows, not the payloads of the evidence", async () => {
    getSyncHistory.mockResolvedValue(
      answer(evidence("evidence-1", { groupedOutboundPayloadSnapshot: "{}", rawDetails: "{}", notes: ["internal"] }))
    );

    const { result } = renderHook(() => useSyncHistory({ domitsPropertyId: "property-1" }));

    await waitFor(() => expect(result.current.loadState).toBe(SYNC_HISTORY_STATE.LOADED));
    expect(Object.keys(result.current.rows[0])).not.toEqual(
      expect.arrayContaining(["groupedOutboundPayloadSnapshot", "rawDetails", "notes"])
    );
  });

  test("refetches for a new property and drops the previous rows while loading", async () => {
    const { result, rerender } = renderHook(({ domitsPropertyId }) => useSyncHistory({ domitsPropertyId }), {
      initialProps: { domitsPropertyId: "property-1" },
    });
    await waitFor(() => expect(result.current.loadState).toBe(SYNC_HISTORY_STATE.LOADED));

    getSyncHistory.mockReturnValue(deferred().promise);
    rerender({ domitsPropertyId: "property-2" });

    await waitFor(() => expect(result.current.loadState).toBe(SYNC_HISTORY_STATE.LOADING));
    expect(result.current.rows).toEqual([]);
    expect(getSyncHistory).toHaveBeenLastCalledWith({ domitsPropertyId: "property-2" });
  });

  test("ignores a late response for a property that is no longer selected", async () => {
    const first = deferred();
    getSyncHistory.mockReturnValueOnce(first.promise);
    const { result, rerender } = renderHook(({ domitsPropertyId }) => useSyncHistory({ domitsPropertyId }), {
      initialProps: { domitsPropertyId: "property-1" },
    });

    getSyncHistory.mockResolvedValue(answer(evidence("second")));
    rerender({ domitsPropertyId: "property-2" });
    await waitFor(() => expect(result.current.rows.map((row) => row.id)).toEqual(["second"]));

    await act(async () => {
      first.resolve(answer(evidence("stale")));
    });

    expect(result.current.rows.map((row) => row.id)).toEqual(["second"]);
  });

  test("treats a 404 CHANNEX_NOT_FOUND as unavailable, not as an error, and logs nothing", async () => {
    getSyncHistory.mockRejectedValue(
      Object.assign(new Error("not found"), { status: 404, responseBody: { errorCode: "CHANNEX_NOT_FOUND" } })
    );

    const { result } = renderHook(() => useSyncHistory({ domitsPropertyId: "property-1" }));

    await waitFor(() => expect(result.current.loadState).toBe(SYNC_HISTORY_STATE.UNAVAILABLE));
    expect(result.current.rows).toEqual([]);
    expect(consoleError).not.toHaveBeenCalled();
  });

  test.each([
    { label: "a 404 without the CHANNEX_NOT_FOUND code", failure: Object.assign(new Error("Not Found"), { status: 404 }) },
    { label: "a 500", failure: Object.assign(new Error("boom"), { status: 500 }) },
    { label: "a network failure", failure: new Error("Network request failed") },
  ])("reports an error, and logs it, on $label", async ({ failure }) => {
    getSyncHistory.mockRejectedValue(failure);

    const { result } = renderHook(() => useSyncHistory({ domitsPropertyId: "property-1" }));

    await waitFor(() => expect(result.current.loadState).toBe(SYNC_HISTORY_STATE.ERROR));
    expect(result.current.rows).toEqual([]);
    expect(consoleError).toHaveBeenCalledWith(expect.any(String), failure);
  });

  test("reports an error, not an empty history, when the answer has no list", async () => {
    getSyncHistory.mockResolvedValue({ channel: "CHANNEX" });

    const { result } = renderHook(() => useSyncHistory({ domitsPropertyId: "property-1" }));

    await waitFor(() => expect(result.current.loadState).toBe(SYNC_HISTORY_STATE.ERROR));
    expect(result.current.rows).toEqual([]);
  });

  test("does not poll: one request however long the tab stays open", async () => {
    jest.useFakeTimers();
    try {
      const { result } = renderHook(() => useSyncHistory({ domitsPropertyId: "property-1" }));
      await waitFor(() => expect(result.current.loadState).toBe(SYNC_HISTORY_STATE.LOADED));

      await act(async () => {
        jest.advanceTimersByTime(60 * 60 * 1000);
      });

      expect(getSyncHistory).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });
});
