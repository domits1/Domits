jest.mock("../../../services/getAccessToken", () => ({ getAccessToken: jest.fn() }));
import { getPublicReviews } from "./reviewAPI";
test("encodes the selected property and fetches public reviews without credentials", async () => {
  const originalFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => '{"reviews":[]}' });
  try {
    await expect(getPublicReviews("property & one", 10, undefined, { minRating: "4", startDate: "2026-01-01", maxRating: "" }))
      .resolves.toEqual({ reviews: [] });
    const [url, options] = global.fetch.mock.calls[0];
    expect(new URL(url).pathname).toBe("/default/properties/property%20%26%20one/reviews");
    expect(new URL(url).searchParams.get("offset")).toBe("10");
    expect(new URL(url).searchParams.get("minRating")).toBe("4");
    expect(new URL(url).searchParams.get("startDate")).toBe("2026-01-01");
    expect(new URL(url).searchParams.has("maxRating")).toBe(false);
    expect(options.headers).toBeUndefined();
    global.fetch.mockResolvedValue({ ok: false, text: async () => "" });
    await expect(getPublicReviews("p1", 0)).rejects.toThrow("Could not load reviews");
    global.fetch.mockResolvedValue({ ok: false, text: async () => '{"message":"Invalid review date."}' });
    await expect(getPublicReviews("p1", 0)).rejects.toThrow("Invalid review date.");
  } finally {
    global.fetch = originalFetch;
  }
});
