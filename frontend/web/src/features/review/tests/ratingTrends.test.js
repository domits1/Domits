import { getPropertyRatingTrends, API_REVIEW_BASE } from "../services/reviewAPI";
jest.mock("../../../services/getAccessToken", () => ({ getAccessToken: () => "token" }));
afterEach(() => { delete global.fetch; });
test("sends authenticated trend filters and preserves the backend response", async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => '{"properties":[]}' });
  const query = { endDate: "2026-10-06", days: "30", offset: "25" };
  expect(await getPropertyRatingTrends(query)).toEqual({ properties: [] });
  const [url, options] = fetch.mock.calls[0];
  expect(url.startsWith(`${API_REVIEW_BASE}/reviews?`)).toBe(true);
  expect(Object.fromEntries(new URL(url).searchParams)).toEqual({ ...query, scope: "property-trends" });
  expect(options.headers.Authorization).toBe("token");
});
test("surfaces backend errors", async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false, text: async () => '{"message":"Access denied"}' });
  await expect(getPropertyRatingTrends({})).rejects.toThrow("Access denied");
});
