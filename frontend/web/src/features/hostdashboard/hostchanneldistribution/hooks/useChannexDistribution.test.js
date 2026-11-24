import { act, renderHook, waitFor } from "@testing-library/react";
import { useChannexDistribution } from "./useChannexDistribution";
import { getChannexStatus } from "../services/channexDistributionService";

jest.mock("../services/channexDistributionService");

const CONNECTED_STATUS = { status: "CONNECTED" };

describe("useChannexDistribution", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    getChannexStatus.mockResolvedValue(CONNECTED_STATUS);
  });

  test("sets error and clears loading when getChannexStatus rejects", async () => {
    getChannexStatus.mockRejectedValue(new Error("GET /integrations/channex/status failed with status 500"));

    const { result } = renderHook(() => useChannexDistribution());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("GET /integrations/channex/status failed with status 500");
    expect(result.current.status).toBeNull();
  });

  test("exposes the HTTP status of the failed request", async () => {
    getChannexStatus.mockRejectedValue(Object.assign(new Error("forbidden"), { status: 403 }));

    const { result } = renderHook(() => useChannexDistribution());

    await waitFor(() => expect(result.current.errorStatus).toBe(403));
  });

  test("reload clears the error and fetches again", async () => {
    getChannexStatus.mockRejectedValueOnce(new Error("boom"));

    const { result } = renderHook(() => useChannexDistribution());
    await waitFor(() => expect(result.current.error).toBe("boom"));

    act(() => result.current.reload());

    await waitFor(() => expect(result.current.status).toEqual(CONNECTED_STATUS));
    expect(result.current.error).toBeNull();
    expect(getChannexStatus).toHaveBeenCalledTimes(2);
  });

  test("loads the status once and exposes it", async () => {
    const { result } = renderHook(() => useChannexDistribution());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.status).toEqual(CONNECTED_STATUS);
    expect(getChannexStatus).toHaveBeenCalledTimes(1);
  });

  test("makes no request and reports nothing while disabled, even after reload", async () => {
    const { result } = renderHook(() => useChannexDistribution({ enabled: false }));
    act(() => result.current.reload());

    expect(result.current).toMatchObject({ status: null, loading: false, error: null, errorStatus: null });
    expect(getChannexStatus).not.toHaveBeenCalled();
  });

  test("still loads when enabled is passed as true", async () => {
    const { result } = renderHook(() => useChannexDistribution({ enabled: true }));

    await waitFor(() => expect(result.current.status).toEqual(CONNECTED_STATUS));
    expect(getChannexStatus).toHaveBeenCalledTimes(1);
  });

  test("loads once, without a loading flash, when it becomes enabled", async () => {
    const { result, rerender } = renderHook(({ enabled }) => useChannexDistribution({ enabled }), {
      initialProps: { enabled: false },
    });
    expect(getChannexStatus).not.toHaveBeenCalled();

    rerender({ enabled: true });
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.status).toEqual(CONNECTED_STATUS));
    expect(getChannexStatus).toHaveBeenCalledTimes(1);
  });
});
