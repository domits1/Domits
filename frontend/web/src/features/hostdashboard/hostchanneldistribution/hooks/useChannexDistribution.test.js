import { act, renderHook, waitFor } from "@testing-library/react";
import { useChannexDistribution } from "./useChannexDistribution";
import { getChannexStatus, getLatestSyncEvidence } from "../services/channexDistributionService";

jest.mock("../services/channexDistributionService");

const CONNECTED_STATUS = { status: "CONNECTED" };

describe("useChannexDistribution", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    getChannexStatus.mockResolvedValue(CONNECTED_STATUS);
    getLatestSyncEvidence.mockResolvedValue({ item: null });
  });

  test("sets error and clears loading when getChannexStatus rejects", async () => {
    getChannexStatus.mockRejectedValue(new Error("GET /integrations/channex/status failed with status 500"));

    const { result } = renderHook(() => useChannexDistribution({ userId: "user-1" }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("GET /integrations/channex/status failed with status 500");
    expect(result.current.status).toBeNull();
  });

  test("exposes the HTTP status of the failed request", async () => {
    getChannexStatus.mockRejectedValue(Object.assign(new Error("forbidden"), { status: 403 }));

    const { result } = renderHook(() => useChannexDistribution({ userId: "user-1" }));

    await waitFor(() => expect(result.current.errorStatus).toBe(403));
  });

  test("reload clears the error and fetches again", async () => {
    getChannexStatus.mockRejectedValueOnce(new Error("boom"));

    const { result } = renderHook(() => useChannexDistribution({ userId: "user-1" }));
    await waitFor(() => expect(result.current.error).toBe("boom"));

    act(() => result.current.reload());

    await waitFor(() => expect(result.current.status).toEqual(CONNECTED_STATUS));
    expect(result.current.error).toBeNull();
    expect(getChannexStatus).toHaveBeenCalledTimes(2);
  });

  test("does not fetch sync evidence until a property is selected", async () => {
    const { result } = renderHook(() => useChannexDistribution({ userId: "user-1" }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(getLatestSyncEvidence).not.toHaveBeenCalled();
  });

  test("refetches sync evidence for a new property without refetching status", async () => {
    const { result, rerender } = renderHook(
      ({ domitsPropertyId }) => useChannexDistribution({ userId: "user-1", domitsPropertyId }),
      { initialProps: { domitsPropertyId: "property-1" } }
    );
    await waitFor(() => expect(result.current.status).toEqual(CONNECTED_STATUS));

    rerender({ domitsPropertyId: "property-2" });

    await waitFor(() => expect(getLatestSyncEvidence).toHaveBeenLastCalledWith({ domitsPropertyId: "property-2" }));
    expect(getLatestSyncEvidence).toHaveBeenCalledTimes(2);
    expect(getChannexStatus).toHaveBeenCalledTimes(1);
  });
});
