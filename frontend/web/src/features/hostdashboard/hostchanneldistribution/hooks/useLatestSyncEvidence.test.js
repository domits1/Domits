import { act, renderHook, waitFor } from "@testing-library/react";
import { LATEST_SYNC_STATE, useLatestSyncEvidence } from "./useLatestSyncEvidence";
import { getLatestSyncEvidence } from "../services/channexDistributionService";

jest.mock("../services/channexDistributionService");

const ITEM = { id: "evidence-1", status: "SUCCESS", overallSuccess: true, finishedAt: 1758700005000 };

const deferred = () => {
  let resolve;
  const promise = new Promise((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
};

describe("useLatestSyncEvidence", () => {
  let consoleError;

  beforeEach(() => {
    jest.resetAllMocks();
    consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    getLatestSyncEvidence.mockResolvedValue({ item: ITEM });
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  test("makes no request and stays idle until a property is selected", async () => {
    const { result } = renderHook(() => useLatestSyncEvidence({ domitsPropertyId: "" }));

    // Give a would-be request time to land before asserting that nothing happened.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(getLatestSyncEvidence).not.toHaveBeenCalled();
    expect(result.current).toEqual({ item: null, loadState: LATEST_SYNC_STATE.IDLE });
  });

  test("is loading first, then exposes the latest item of the selected property", async () => {
    const { result } = renderHook(() => useLatestSyncEvidence({ domitsPropertyId: "property-1" }));

    expect(result.current.loadState).toBe(LATEST_SYNC_STATE.LOADING);

    await waitFor(() => expect(result.current.loadState).toBe(LATEST_SYNC_STATE.LOADED));
    expect(result.current.item).toEqual(ITEM);
    expect(getLatestSyncEvidence).toHaveBeenCalledWith({ domitsPropertyId: "property-1" });
  });

  test("is loaded with no item when the property has no evidence yet", async () => {
    getLatestSyncEvidence.mockResolvedValue({ item: null });

    const { result } = renderHook(() => useLatestSyncEvidence({ domitsPropertyId: "property-1" }));

    await waitFor(() => expect(result.current.loadState).toBe(LATEST_SYNC_STATE.LOADED));
    expect(result.current.item).toBeNull();
  });

  test("refetches for a new property and drops the previous item while loading", async () => {
    const { result, rerender } = renderHook(({ domitsPropertyId }) => useLatestSyncEvidence({ domitsPropertyId }), {
      initialProps: { domitsPropertyId: "property-1" },
    });
    await waitFor(() => expect(result.current.loadState).toBe(LATEST_SYNC_STATE.LOADED));

    const second = deferred();
    getLatestSyncEvidence.mockReturnValue(second.promise);
    rerender({ domitsPropertyId: "property-2" });

    await waitFor(() => expect(result.current.loadState).toBe(LATEST_SYNC_STATE.LOADING));
    expect(result.current.item).toBeNull();
    expect(getLatestSyncEvidence).toHaveBeenLastCalledWith({ domitsPropertyId: "property-2" });
  });

  test("never pairs the previous property's item with the newly selected property, not even for one render", async () => {
    const renders = [];
    const { result, rerender } = renderHook(
      ({ domitsPropertyId }) => {
        const value = useLatestSyncEvidence({ domitsPropertyId });
        renders.push({ domitsPropertyId, ...value });
        return value;
      },
      { initialProps: { domitsPropertyId: "property-1" } }
    );
    await waitFor(() => expect(result.current.item).toEqual(ITEM));

    getLatestSyncEvidence.mockResolvedValue({ item: { ...ITEM, id: "evidence-2" } });
    rerender({ domitsPropertyId: "property-2" });
    await waitFor(() => expect(result.current.item).toEqual({ ...ITEM, id: "evidence-2" }));

    const rendersForSecondProperty = renders.filter((render) => render.domitsPropertyId === "property-2");
    expect(rendersForSecondProperty.length).toBeGreaterThan(1);
    expect(rendersForSecondProperty.some((render) => render.item?.id === ITEM.id)).toBe(false);
    expect(rendersForSecondProperty[0].loadState).toBe(LATEST_SYNC_STATE.LOADING);
  });

  test("ignores a late response for a property that is no longer selected", async () => {
    const first = deferred();
    getLatestSyncEvidence.mockReturnValueOnce(first.promise);
    const { result, rerender } = renderHook(({ domitsPropertyId }) => useLatestSyncEvidence({ domitsPropertyId }), {
      initialProps: { domitsPropertyId: "property-1" },
    });

    getLatestSyncEvidence.mockResolvedValue({ item: { ...ITEM, id: "evidence-2" } });
    rerender({ domitsPropertyId: "property-2" });
    await waitFor(() => expect(result.current.item).toEqual({ ...ITEM, id: "evidence-2" }));

    await act(async () => {
      first.resolve({ item: { ...ITEM, id: "stale" } });
    });

    expect(result.current.item).toEqual({ ...ITEM, id: "evidence-2" });
  });

  test("treats a 404 CHANNEX_NOT_FOUND as unavailable, not as an error, and logs nothing", async () => {
    getLatestSyncEvidence.mockRejectedValue(
      Object.assign(new Error("not found"), { status: 404, responseBody: { errorCode: "CHANNEX_NOT_FOUND" } })
    );

    const { result } = renderHook(() => useLatestSyncEvidence({ domitsPropertyId: "property-1" }));

    await waitFor(() => expect(result.current.loadState).toBe(LATEST_SYNC_STATE.UNAVAILABLE));
    expect(result.current.item).toBeNull();
    expect(consoleError).not.toHaveBeenCalled();
  });

  test.each([
    { label: "a 404 without the CHANNEX_NOT_FOUND code", failure: Object.assign(new Error("Not Found"), { status: 404 }) },
    { label: "a 500", failure: Object.assign(new Error("boom"), { status: 500 }) },
    { label: "a network failure", failure: new Error("Network request failed") },
  ])("reports an error, and logs it, on $label", async ({ failure }) => {
    getLatestSyncEvidence.mockRejectedValue(failure);

    const { result } = renderHook(() => useLatestSyncEvidence({ domitsPropertyId: "property-1" }));

    await waitFor(() => expect(result.current.loadState).toBe(LATEST_SYNC_STATE.ERROR));
    expect(result.current.item).toBeNull();
    expect(consoleError).toHaveBeenCalledWith(expect.any(String), failure);
  });
});
