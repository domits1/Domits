import {
  createReview,
  getGuestReviewHistory,
  getReviewApiBase,
  getReviewNotificationPreference,
  setReviewNotificationPreference,
  updateReview,
} from "./reviewAPI";
// Review: Covers guest review writes, history, and notification-preference requests.
jest.mock("../../../services/getAccessToken", () => ({
  getAccessToken: () => "access-token-1",
}));

describe("guest review API", () => {
  // Replaces fetch with a mock before each test.
  // This isolates request behavior from the network.
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  // Clears mock call history after each test.
  // Prevents assertions from leaking across cases.
  afterEach(() => {
    jest.clearAllMocks();
  });

  // Confirms the API helper returns the expected Gateway endpoint.
  // Keeps the frontend pointed at the ReviewSystem API.
  test("uses the ReviewSystem API Gateway", () => {
    expect(getReviewApiBase()).toBe(
      "https://vk70rgm6z0.execute-api.eu-north-1.amazonaws.com/default/reviews"
    );
  });

  // Confirms history is fetched for the authenticated guest.
  // Verifies the query parameter and authorization header.
  test("fetches guest review history with authorization", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          reviews: [{ id: "review-1" }],
        }),
    });

    await expect(getGuestReviewHistory()).resolves.toEqual([
      { id: "review-1" },
    ]);

    expect(global.fetch).toHaveBeenCalledWith(
      `${getReviewApiBase()}?mine=true`,
      {
        method: "GET",
        headers: {
          Authorization: "access-token-1",
        },
      }
    );
  });

  // Confirms preference reads and updates include authorization.
  // Verifies the GET and PATCH request formats.
  test("reads and updates review email preferences with authorization", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          emailEnabled: false,
        }),
    });

    await expect(
      getReviewNotificationPreference()
    ).resolves.toEqual({
      emailEnabled: false,
    });

    await expect(
      setReviewNotificationPreference(false)
    ).resolves.toEqual({
      emailEnabled: false,
    });

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      `${getReviewApiBase()}/notification-preferences`,
      {
        method: "GET",
        headers: {
          Authorization: "access-token-1",
        },
      }
    );

    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      `${getReviewApiBase()}/notification-preferences`,
      {
        method: "PATCH",
        headers: {
          Authorization: "access-token-1",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emailEnabled: false,
        }),
      }
    );
  });

  // Confirms backend error messages are surfaced to the caller.
  // Exercises the history request failure path.
  test("surfaces backend errors when loading history fails", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      text: async () =>
        JSON.stringify({
          message: "Review service unavailable.",
        }),
    });

    await expect(
      getGuestReviewHistory()
    ).rejects.toThrow("Review service unavailable.");
  });

  // Confirms review creation sends the payload with authorization.
  // Verifies the response is returned to the caller.
  test("creates a review with authorization", async () => {
    const payload = {
      rating: 5,
      comment: "Great stay",
    };

    global.fetch.mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          id: "review-1",
          ...payload,
        }),
    });

    await expect(createReview(payload)).resolves.toEqual({
      id: "review-1",
      ...payload,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      getReviewApiBase(),
      {
        method: "POST",
        headers: {
          Authorization: "access-token-1",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );
  });

  // Confirms review updates use the review-specific endpoint.
  // Verifies the PATCH method, payload, and authorization header.
  test("updates a review with authorization", async () => {
    const payload = {
      rating: 4,
    };

    global.fetch.mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          id: "review-1",
          rating: 4,
        }),
    });

    await expect(
      updateReview("review-1", payload)
    ).resolves.toEqual({
      id: "review-1",
      rating: 4,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      `${getReviewApiBase()}/review-1`,
      {
        method: "PATCH",
        headers: {
          Authorization: "access-token-1",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );
  });
});