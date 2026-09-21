import {
  deleteReviewResponse,
  editReviewResponse,
  fetchHostReviews,
  publishReviewResponse,
  saveDraftReviewResponse,
} from "./reviewResponseService";

jest.mock("../../../services/getAccessToken", () => ({
  getAccessToken: () => "access-token-1",
}));

describe("reviewResponseService", () => {
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

  test("fetches host reviews with authorization", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ reviews: [{ id: "review-1" }] }),
    });

    await expect(fetchHostReviews("host-1")).resolves.toEqual([{ id: "review-1" }]);
    expect(global.fetch).toHaveBeenCalledWith("https://example.test/reviews?hostId=host-1", {
      method: "GET",
      headers: {
        Authorization: "access-token-1",
        "Content-Type": "application/json",
      },
    });
  });

  test("saves draft review responses", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ response: { id: "response-1", status: "draft" } }),
    });

    await saveDraftReviewResponse("review-1", "Thanks for staying.");

    expect(global.fetch).toHaveBeenCalledWith("https://example.test/reviews/review-1/response", {
      method: "POST",
      headers: {
        Authorization: "access-token-1",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: "Thanks for staying." }),
    });
  });

  test("publishes review responses", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ response: { id: "response-1", status: "published" } }),
    });

    await publishReviewResponse("review-1", "Thanks for staying.");

    expect(global.fetch).toHaveBeenCalledWith("https://example.test/reviews/review-1/response/publish", {
      method: "POST",
      headers: {
        Authorization: "access-token-1",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: "Thanks for staying." }),
    });
  });

  test("surfaces backend permission errors", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      text: async () => JSON.stringify({ message: "You are not allowed to respond to this review." }),
    });

    await expect(saveDraftReviewResponse("review-1", "Nope.")).rejects.toThrow(
      "You are not allowed to respond to this review."
    );
  });

  test("uses local host review data when no review API base is configured", async () => {
    delete process.env.REACT_APP_REVIEW_API_BASE;

    await expect(fetchHostReviews("host-demo")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "host-demo-review-1",
          status: "PUBLISHED",
          publicationStatus: "PUBLISHED",
          response: expect.objectContaining({ status: "draft" }),
        }),
        expect.objectContaining({
          id: "host-demo-review-2",
          response: expect.objectContaining({ status: "published" }),
        }),
      ])
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("updates local host review responses when using fallback data", async () => {
    delete process.env.REACT_APP_REVIEW_API_BASE;
    await fetchHostReviews("host-local-actions");

    await expect(saveDraftReviewResponse("host-local-actions-review-3", "Thanks for the thoughtful note.")).resolves.toEqual({
      response: expect.objectContaining({
        message: "Thanks for the thoughtful note.",
        status: "draft",
      }),
    });

    await expect(editReviewResponse("host-local-actions-review-3", "Thanks again for the thoughtful note.")).resolves.toEqual({
      response: expect.objectContaining({
        message: "Thanks again for the thoughtful note.",
        status: "draft",
      }),
    });

    await expect(publishReviewResponse("host-local-actions-review-3", "Thanks again for the thoughtful note.")).resolves.toEqual({
      response: expect.objectContaining({
        message: "Thanks again for the thoughtful note.",
        status: "published",
      }),
    });

    await expect(deleteReviewResponse("host-local-actions-review-3")).resolves.toEqual({
      message: "Review response deleted.",
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
