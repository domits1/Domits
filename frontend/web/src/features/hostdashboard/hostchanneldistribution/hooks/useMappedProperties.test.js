import { renderHook, waitFor } from "@testing-library/react";
import { MAPPED_PROPERTIES_STATE, useMappedProperties } from "./useMappedProperties";
import { getMappedProperties } from "../services/channexDistributionService";

jest.mock("../services/channexDistributionService");

const LISTINGS = [
  { property: { id: "property-1", title: "Canal house" } },
  { property: { id: "property-2" } },
  { property: {} },
];

describe("useMappedProperties", () => {
  let consoleError;

  beforeEach(() => {
    jest.resetAllMocks();
    consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    getMappedProperties.mockResolvedValue(LISTINGS);
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  test("is loading first, then maps listings to picker options, falling back to the id as label and dropping entries without an id", async () => {
    const { result } = renderHook(() => useMappedProperties());

    expect(result.current.loadState).toBe(MAPPED_PROPERTIES_STATE.LOADING);

    await waitFor(() => expect(result.current.loadState).toBe(MAPPED_PROPERTIES_STATE.LOADED));
    expect(result.current.options).toEqual([
      { value: "property-1", label: "Canal house" },
      { value: "property-2", label: "property-2" },
    ]);
  });

  test("makes no request and stays idle when disabled", async () => {
    const { result } = renderHook(() => useMappedProperties({ enabled: false }));

    // Give a would-be request time to land before asserting that nothing happened.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(getMappedProperties).not.toHaveBeenCalled();
    expect(result.current).toEqual({ options: [], loadState: MAPPED_PROPERTIES_STATE.IDLE });
  });

  test("requests once when it becomes enabled, and not again on a rerender", async () => {
    const { result, rerender } = renderHook(({ enabled }) => useMappedProperties({ enabled }), {
      initialProps: { enabled: false },
    });
    expect(getMappedProperties).not.toHaveBeenCalled();

    rerender({ enabled: true });
    await waitFor(() => expect(result.current.loadState).toBe(MAPPED_PROPERTIES_STATE.LOADED));
    rerender({ enabled: true });

    expect(getMappedProperties).toHaveBeenCalledTimes(1);
  });

  test("is loaded with no options when the host has no linked properties", async () => {
    getMappedProperties.mockResolvedValue([]);

    const { result } = renderHook(() => useMappedProperties());

    await waitFor(() => expect(result.current.loadState).toBe(MAPPED_PROPERTIES_STATE.LOADED));
    expect(result.current.options).toEqual([]);
  });

  test.each(["CHANNEX_NOT_CONNECTED", "CHANNEX_RECONNECT_REQUIRED"])(
    "treats a 409 (%s) as unavailable, not as an error, and logs nothing",
    async (errorCode) => {
      getMappedProperties.mockRejectedValue(
        Object.assign(new Error("not connected"), { status: 409, responseBody: { errorCode } })
      );

      const { result } = renderHook(() => useMappedProperties());

      await waitFor(() => expect(result.current.loadState).toBe(MAPPED_PROPERTIES_STATE.UNAVAILABLE));
      expect(result.current.options).toEqual([]);
      expect(consoleError).not.toHaveBeenCalled();
    }
  );

  test.each([
    { label: "a 500", failure: Object.assign(new Error("boom"), { status: 500 }) },
    { label: "a network failure", failure: new Error("Network request failed") },
    { label: "a missing token", failure: new Error("No access token available") },
  ])("reports an error, and logs it, on $label", async ({ failure }) => {
    getMappedProperties.mockRejectedValue(failure);

    const { result } = renderHook(() => useMappedProperties());

    await waitFor(() => expect(result.current.loadState).toBe(MAPPED_PROPERTIES_STATE.ERROR));
    expect(result.current.options).toEqual([]);
    expect(consoleError).toHaveBeenCalledWith(expect.any(String), failure);
  });
});
