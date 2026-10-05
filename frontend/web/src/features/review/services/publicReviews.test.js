jest.mock("../../../services/getAccessToken", () => ({ getAccessToken: jest.fn() }));
import { getPublicReviews } from "./reviewAPI";
test("encodes the selected property and fetches public reviews without credentials", async () => {
  const originalFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ reviews: [] }) });
  try {
    await expect(getPublicReviews("property & one", 10)).resolves.toEqual({ reviews: [] });
    const [url, options] = global.fetch.mock.calls[0];
    expect(new URL(url).searchParams.get("propertyId")).toBe("property & one");
    expect(new URL(url).searchParams.get("offset")).toBe("10");
    expect(options.headers).toBeUndefined();
    global.fetch.mockResolvedValue({ ok: false });
    await expect(getPublicReviews("p1", 0)).rejects.toThrow("Could not load reviews");
  } finally {
    global.fetch = originalFetch;
  }
});
