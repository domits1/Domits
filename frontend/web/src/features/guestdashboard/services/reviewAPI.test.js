import {
  createReview,
  getGuestReviewHistory,
  getReviewApiBase,
  getReviewById,
  getReviewNotificationPreference,
  setReviewNotificationPreference,
  updateReview,
} from "./reviewAPI";

jest.mock("../../../services/getAccessToken", () => ({
  getAccessToken: () => "access-token-1",
}));

describe("guest review API", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("uses the ReviewSystem API Gateway", () => {
    expect(getReviewApiBase()).toBe(
      "https://vk70rgm6z0.execute-api.eu-north-1.amazonaws.com/default/reviews"
    );
  });

  test("fetches guest review history with authorization", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ reviews: [{ id: "review-1" }] }),
    });

    await expect(getGuestReviewHistory()).resolves.toEqual([{ id: "review-1" }]);
    expect(global.fetch).toHaveBeenCalledWith(`${getReviewApiBase()}?mine=true`, {
      method: "GET",
      headers: {
        Authorization: "access-token-1",
      },
    });
  });

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

  test("surfaces backend errors when loading history fails", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      text: async () => JSON.stringify({ message: "Review service unavailable." }),
    });

    await expect(getGuestReviewHistory()).rejects.toThrow("Review service unavailable.");
  });

  test("creates, reads, and updates reviews with authorization", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ review: { id: "review-1" } }),
    });

    await createReview({ title: "A great stay" });
    await expect(getReviewById("review-1")).resolves.toEqual({ id: "review-1" });
    await updateReview("review-1", { title: "An excellent stay" });

    expect(global.fetch).toHaveBeenNthCalledWith(1, getReviewApiBase(), {
      method: "POST",
      headers: {
        Authorization: "access-token-1",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: "A great stay" }),
    });
    expect(global.fetch).toHaveBeenNthCalledWith(2, `${getReviewApiBase()}/review-1`, {
      method: "GET",
      headers: { Authorization: "access-token-1" },
    });
    expect(global.fetch).toHaveBeenNthCalledWith(3, `${getReviewApiBase()}/review-1`, {
      method: "PATCH",
      headers: {
        Authorization: "access-token-1",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: "An excellent stay" }),
    });
  });
});
