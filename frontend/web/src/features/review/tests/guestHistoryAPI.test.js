import { API_REVIEW_BASE, getGuestReviewHistory, getGuestReviewDetail } from "../services/reviewAPI";
jest.mock("../../../services/getAccessToken", () => ({ getAccessToken: () => "token" }));
test("uses authenticated history routes and propagates detail errors", async () => {
  const original = global.fetch, signal = new AbortController().signal;
  global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => '{"reviews":[],"next_offset":null}' });
  try {
    await getGuestReviewHistory(10, signal);
    expect(fetch).toHaveBeenCalledWith(`${API_REVIEW_BASE}/reviews?scope=guest-history&offset=10`,
      { method: "GET", headers: { Authorization: "token" }, signal });
    global.fetch.mockResolvedValue({ ok: false, text: async () => '{"message":"Review not found."}' });
    await expect(getGuestReviewDetail("review & one", signal)).rejects.toThrow("Review not found.");
    expect(fetch).toHaveBeenLastCalledWith(`${API_REVIEW_BASE}/reviews/review%20%26%20one?view=history`,
      { method: "GET", headers: { Authorization: "token" }, signal });
  } finally { global.fetch = original; }
});
