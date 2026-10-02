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

  test("refresh clears the error and fetches again", async () => {
    getChannexStatus.mockRejectedValueOnce(Object.assign(new Error("boom"), { status: 500 }));

    const { result } = renderHook(() => useChannexDistribution({ userId: "user-1" }));
    await waitFor(() => expect(result.current.error).toBe("boom"));

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.status).toEqual(CONNECTED_STATUS);
    expect(result.current.error).toBeNull();
    expect(result.current.errorStatus).toBeNull();
    expect(getChannexStatus).toHaveBeenCalledTimes(2);
  });
});
