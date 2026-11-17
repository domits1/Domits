import { renderHook, waitFor } from "@testing-library/react";
import { useMappedProperties } from "./useMappedProperties";
import { getMappedProperties } from "../services/channexDistributionService";

jest.mock("../services/channexDistributionService");

const LISTINGS = [
  { property: { id: "property-1", title: "Canal house" } },
  { property: { id: "property-2" } },
  { property: {} },
];

describe("useMappedProperties", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    getMappedProperties.mockResolvedValue(LISTINGS);
  });

  test("maps listings to picker options, falling back to the id as label and dropping entries without an id", async () => {
    const { result } = renderHook(() => useMappedProperties({ userId: "user-1" }));

    await waitFor(() => expect(result.current).toHaveLength(2));
    expect(result.current).toEqual([
      { value: "property-1", label: "Canal house" },
      { value: "property-2", label: "property-2" },
    ]);
  });

  test("makes no request and returns no options when disabled", async () => {
    const { result } = renderHook(() => useMappedProperties({ userId: "user-1", enabled: false }));

    // Give a would-be request time to land before asserting that nothing happened.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(getMappedProperties).not.toHaveBeenCalled();
    expect(result.current).toEqual([]);
  });

  test("returns no options, and logs the failure, when the request rejects", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    getMappedProperties.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useMappedProperties({ userId: "user-1" }));

    await waitFor(() => expect(consoleError).toHaveBeenCalledWith(expect.any(String), expect.any(Error)));
    expect(result.current).toEqual([]);
    consoleError.mockRestore();
  });
});
