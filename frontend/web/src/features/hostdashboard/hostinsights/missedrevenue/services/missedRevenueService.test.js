/**
 * @jest-environment jsdom
 */

import { Auth } from "aws-amplify";
import { fetchMissedRevenue } from "./missedRevenueService";

jest.mock("aws-amplify", () => ({
  Auth: {
    currentSession: jest.fn(),
  },
}));

describe("fetchMissedRevenue", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Auth.currentSession.mockResolvedValue({
      getAccessToken: () => ({ getJwtToken: () => "access-token-1" }),
    });
  });

  afterEach(() => {
    delete globalThis.fetch;
  });

  test("sends the Cognito access token as a Bearer header", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ connected: false }),
    });

    await fetchMissedRevenue({ startDate: "2026-09-01", endDate: "2026-09-30" });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/insights/missed-revenue?startDate=2026-09-01&endDate=2026-09-30"),
      expect.objectContaining({
        method: "GET",
        headers: { Authorization: "Bearer access-token-1" },
      })
    );
  });

  test("passes through a not-connected response without crashing", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ connected: false }),
    });

    const result = await fetchMissedRevenue({ startDate: "2026-09-01", endDate: "2026-09-30" });

    expect(result.connected).toBe(false);
  });

  test("merges a connected response over the empty default shape, coercing numeric fields", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        connected: true,
        startDate: "2026-09-01",
        endDate: "2026-09-30",
        currency: "EUR",
        grossMissedRevenue: 250,
        actualRevenue: "not-a-number",
        potentialRevenue: 500,
        revenueEfficiencyPct: 50,
        byProperty: [{ propertyId: "prop-1", missedRevenue: 100, actualRevenue: 200, potentialRevenue: 300 }],
      }),
    });

    const result = await fetchMissedRevenue({ startDate: "2026-09-01", endDate: "2026-09-30" });

    expect(result.connected).toBe(true);
    expect(result.grossMissedRevenue).toBe(250);
    expect(result.actualRevenue).toBe(0);
    expect(result.potentialRevenue).toBe(500);
    expect(result.revenueEfficiencyPct).toBe(50);
    expect(result.byProperty).toEqual([
      expect.objectContaining({ propertyId: "prop-1", missedRevenue: 100, actualRevenue: 200, potentialRevenue: 300 }),
    ]);
  });

  test("throws the backend's error message on a non-OK response", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      text: jest.fn().mockResolvedValue(JSON.stringify({ message: "Date range must not exceed 366 days" })),
    });

    await expect(fetchMissedRevenue({ startDate: "2026-01-01", endDate: "2027-12-31" })).rejects.toThrow(
      "Date range must not exceed 366 days"
    );
  });

  test("does not send a request without an authenticated session", async () => {
    Auth.currentSession.mockRejectedValueOnce(new Error("No current user"));
    globalThis.fetch = jest.fn();

    await expect(fetchMissedRevenue({ startDate: "2026-09-01", endDate: "2026-09-30" })).rejects.toThrow(
      "No current user"
    );
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
