import { renderHook, waitFor } from "@testing-library/react";
import { PROPERTY_REQUEST_STATE, usePropertyScopedRequest } from "./usePropertyScopedRequest";

describe("usePropertyScopedRequest", () => {
  test("a new request and select function on every render do not restart the request", async () => {
    const load = jest.fn().mockResolvedValue({ value: 1 });

    const { result, rerender } = renderHook(
      ({ tick }) =>
        usePropertyScopedRequest({
          propertyId: "property-1",
          request: (propertyId) => load(propertyId, tick),
          select: (response) => response.value,
          errorMessage: "failed:",
        }),
      { initialProps: { tick: 0 } }
    );
    await waitFor(() => expect(result.current.loadState).toBe(PROPERTY_REQUEST_STATE.LOADED));

    rerender({ tick: 1 });
    rerender({ tick: 2 });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(load).toHaveBeenCalledTimes(1);
    expect(result.current.data).toBe(1);
  });

  test("a later property change uses the newest request and select functions", async () => {
    const { result, rerender } = renderHook(
      ({ propertyId, label }) =>
        usePropertyScopedRequest({
          propertyId,
          request: async (id) => ({ id }),
          select: (response) => `${label}:${response.id}`,
          errorMessage: "failed:",
        }),
      { initialProps: { propertyId: "property-1", label: "old" } }
    );
    await waitFor(() => expect(result.current.data).toBe("old:property-1"));

    rerender({ propertyId: "property-2", label: "new" });

    await waitFor(() => expect(result.current.data).toBe("new:property-2"));
  });
});
