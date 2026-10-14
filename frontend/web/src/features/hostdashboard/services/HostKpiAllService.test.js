import { HostKpiAllService } from "./HostKpiAllService";

jest.mock("../../../../src/services/getAccessToken.js", () => ({
  getAccessToken: jest.fn(() => "token-1"),
}));

describe("HostKpiAllService.fetchAll", () => {
  afterEach(() => {
    delete globalThis.fetch;
  });

  test("throws when hostId is missing", async () => {
    await expect(HostKpiAllService.fetchAll(undefined, "monthly")).rejects.toThrow("Host ID is missing");
  });

  test("returns null on a non-OK HTTP response, distinct from a legitimately empty result", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: false });

    const result = await HostKpiAllService.fetchAll("host-1", "monthly");

    expect(result).toBeNull();
  });

  test("returns null when the response body is not valid JSON", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockRejectedValue(new Error("Unexpected token")),
    });

    const result = await HostKpiAllService.fetchAll("host-1", "monthly");

    expect(result).toBeNull();
  });

  test("returns the parsed data on a successful response", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ all: { averageDailyRate: 120, occupancyRate: 40 } }),
    });

    const result = await HostKpiAllService.fetchAll("host-1", "monthly");

    expect(result).toEqual({ averageDailyRate: 120, occupancyRate: 40 });
  });

  test("unwraps a Lambda-proxy double-wrapped body", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ body: JSON.stringify({ all: { averageDailyRate: 90 } }) }),
    });

    const result = await HostKpiAllService.fetchAll("host-1", "monthly");

    expect(result).toEqual({ averageDailyRate: 90 });
  });

  test("defaults to the monthly filter type", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ all: {} }),
    });

    await HostKpiAllService.fetchAll("host-1");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("filterType=monthly"),
      expect.anything()
    );
  });

  test("includes formatted start/end dates for a custom range", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ all: {} }),
    });

    await HostKpiAllService.fetchAll("host-1", "custom", "2026-01-01", "2026-09-15");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("startDate=01-01-2026&endDate=15-09-2026"),
      expect.anything()
    );
  });
});
