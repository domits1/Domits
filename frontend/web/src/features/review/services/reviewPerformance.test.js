import { getPropertyReviewPerformance, API_REVIEW_BASE } from "./reviewAPI";
jest.mock("../../../services/getAccessToken", () => ({ getAccessToken: () => "token" }));
afterEach(() => { delete global.fetch; });
test("uses the authenticated review endpoint with performance filters", async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => '{"periods":[]}' });
  const query = { propertyId: "p1", interval: "week", startDate: "2026-01-01", endDate: "2026-03-01" };
  expect(await getPropertyReviewPerformance(query)).toEqual({ periods: [] });
  const [url, options] = fetch.mock.calls[0];
  expect(url.startsWith(`${API_REVIEW_BASE}/reviews?`)).toBe(true);
  expect(Object.fromEntries(new URL(url).searchParams)).toEqual({ ...query, scope: "property-performance" });
  expect(options.headers.Authorization).toBe("token");
});
test("surfaces backend validation and authorization errors", async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false, text: async () => '{"message":"Access denied"}' });
  await expect(getPropertyReviewPerformance({ propertyId: "p1" })).rejects.toThrow("Access denied");
});
