import { getDomitsPrivateFeedback, getDomitsPrivateFeedbackInbox } from "./reviewModerationAPI";

// Review: Verifies protected internal feedback requests and authorization failures.
jest.mock("../../services/getAccessToken", () => ({ getAccessToken: () => "access-token-1" }));
jest.mock("../guestdashboard/services/reviewAPI", () => ({
  getReviewApiBase: () => "https://example.test/reviews",
}));

describe("reviewModerationAPI", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => jest.clearAllMocks());

  it("loads Domits private feedback through the protected review endpoint", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ feedback: [{ id: "feedback-1", message: "Internal note" }] }),
    });

    await expect(getDomitsPrivateFeedback("review/one")).resolves.toEqual({
      feedback: [{ id: "feedback-1", message: "Internal note" }],
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.test/reviews/review%2Fone/domits-private-feedback",
      { headers: { Authorization: "access-token-1" } }
    );
  });

  it("surfaces internal-feedback authorization failures", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ message: "Only authorized Domits internal users can view this feedback." }),
    });

    await expect(getDomitsPrivateFeedback("review-1")).rejects.toThrow(
      "Only authorized Domits internal users can view this feedback."
    );
  });

  it("loads the Domits private feedback inbox", async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ feedback: [] }) });

    await expect(getDomitsPrivateFeedbackInbox()).resolves.toEqual({ feedback: [] });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.test/reviews/domits-private-feedback",
      { headers: { Authorization: "access-token-1" } }
    );
  });
});
