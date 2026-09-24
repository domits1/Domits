import { createReview, getGuestReviewHistory, getReviewNotificationPreference, setReviewNotificationPreference, updateReview } from "./reviewAPI";

// Review: Covers guest review writes, history, and notification-preference requests.
jest.mock("../../../services/getAccessToken", () => ({
  getAccessToken: () => "access-token-1",
}));

describe("guest review API", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    global.fetch = jest.fn();
    process.env = {
      ...originalEnv,
      REACT_APP_REVIEW_API_BASE: "https://example.test/reviews",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  test("fetches guest review history with authorization", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ reviews: [{ id: "review-1" }] }),
    });

    await expect(getGuestReviewHistory()).resolves.toEqual([{ id: "review-1" }]);
    expect(global.fetch).toHaveBeenCalledWith("https://example.test/reviews?mine=true", {
      method: "GET",
      headers: {
        Authorization: "access-token-1",
      },
    });
  });

  test("reports missing review API configuration", async () => {
    delete process.env.REACT_APP_REVIEW_API_BASE;

    await expect(getGuestReviewHistory()).rejects.toThrow("Review service is not configured.");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("reads and updates review email preferences with authorization", async () => {
    global.fetch.mockResolvedValue({ ok: true, text: async () => JSON.stringify({ emailEnabled: false }) });
    await expect(getReviewNotificationPreference()).resolves.toEqual({ emailEnabled: false });
    await expect(setReviewNotificationPreference(false)).resolves.toEqual({ emailEnabled: false });
    expect(global.fetch).toHaveBeenNthCalledWith(1, "https://example.test/reviews/notification-preferences", {
      headers: { Authorization: "access-token-1" },
    });
    expect(global.fetch).toHaveBeenNthCalledWith(2, "https://example.test/reviews/notification-preferences", {
      method: "PATCH", headers: { Authorization: "access-token-1", "Content-Type": "application/json" },
      body: JSON.stringify({ emailEnabled: false }),
    });
  });

  test("surfaces backend errors when loading history fails", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      text: async () => JSON.stringify({ message: "Review service unavailable." }),
    });

    await expect(getGuestReviewHistory()).rejects.toThrow("Review service unavailable.");
  });

  test("uses a readable error for writes when no review API base is configured", async () => {
    delete process.env.REACT_APP_REVIEW_API_BASE;

    await expect(createReview({})).rejects.toThrow("Review service is not configured.");
    await expect(updateReview("review-1", {})).rejects.toThrow("Review service is not configured.");
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
