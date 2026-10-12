import { act, renderHook, waitFor } from "@testing-library/react";
import { getAccessToken } from "../../../../services/getAccessToken";
import { CALENDAR_SAVE_FAILED_MESSAGE, useCalendarSelection } from "./useCalendarSelection";

jest.mock("../../../../services/getAccessToken", () => ({ getAccessToken: jest.fn() }));

const DATE_KEY = "2026-11-02";
const hookProps = {
  cursor: new Date(Date.UTC(2026, 10, 1)),
  monthGrid: [[new Date(Date.UTC(2026, 10, 1)), new Date(Date.UTC(2026, 10, 2))]],
  selectedPropertyId: "property-1",
  pricingSnapshot: { nightlyRate: 100, weekendRate: 120 },
  availabilityRanges: [],
  externalBlockedDates: new Set(),
  bookedDateKeysByPropertyId: {},
};
const okResponse = (body) => ({ ok: true, status: 200, json: async () => body });

describe("useCalendarSelection save failures", () => {
  beforeEach(() => {
    getAccessToken.mockReturnValue("token");
    global.fetch = jest.fn(async (_url, options) =>
      options?.method === "PATCH" ? { ok: false, status: 500, json: async () => ({}) } : okResponse({ overrides: [] })
    );
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  it("tells the host and shows the saved values again when a calendar change is not saved", async () => {
    const { result } = renderHook(() => useCalendarSelection(hookProps));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    act(() => result.current.handleDateSelect({ key: DATE_KEY }));
    act(() => result.current.handleDateSelect({ key: DATE_KEY }));
    act(() => result.current.handleToggleAvailability(false));
    expect(result.current.availabilityOverrides[DATE_KEY]).toBe(false);

    await waitFor(() => expect(result.current.calendarSaveError).toBe(CALENDAR_SAVE_FAILED_MESSAGE));
    await waitFor(() => expect(result.current.availabilityOverrides[DATE_KEY]).toBeUndefined());
    const reloads = global.fetch.mock.calls.filter(([, options]) => options?.method === "GET");
    expect(reloads).toHaveLength(2);
  });

  it("drops the failed-save message when the host switches to another property", async () => {
    const { result, rerender } = renderHook((props) => useCalendarSelection(props), { initialProps: hookProps });
    act(() => result.current.handleDateSelect({ key: DATE_KEY }));
    act(() => result.current.handleDateSelect({ key: DATE_KEY }));
    act(() => result.current.handleToggleAvailability(false));
    await waitFor(() => expect(result.current.calendarSaveError).toBe(CALENDAR_SAVE_FAILED_MESSAGE));

    rerender({ ...hookProps, selectedPropertyId: "property-2" });

    expect(result.current.calendarSaveError).toBe("");
  });
});
