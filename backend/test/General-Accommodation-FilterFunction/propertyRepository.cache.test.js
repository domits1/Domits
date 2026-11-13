const REPO_PATH =
  "../../functions/General-Accommodation-FilterFunction/data/propertyRepository.mjs";

const makeResponse = (body, { ok = true, status = 200 } = {}) => ({
  ok,
  status,
  json: async () => body,
});

// One page of properties, no pagination key — keeps fetchAllProperties to a
// single upstream call per cold fetch.
const singlePage = () => makeResponse({ properties: [{ id: "a" }], lastEvaluatedKey: null });

describe("fetchAllProperties catalog cache", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    globalThis.fetch = jest.fn().mockResolvedValue(singlePage());
  });

  afterEach(() => {
    jest.useRealTimers();
    delete globalThis.fetch;
  });

  test("serves a warm cache without re-fetching within the TTL", async () => {
    const { fetchAllProperties } = await import(REPO_PATH);

    const first = await fetchAllProperties();
    const second = await fetchAllProperties();

    expect(second).toEqual(first);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  test("re-fetches once the TTL has elapsed", async () => {
    const { fetchAllProperties } = await import(REPO_PATH);

    await fetchAllProperties();
    jest.advanceTimersByTime(60_001);
    await fetchAllProperties();

    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  test("dedupes concurrent cold fetches into a single download", async () => {
    const { fetchAllProperties } = await import(REPO_PATH);

    await Promise.all([fetchAllProperties(), fetchAllProperties(), fetchAllProperties()]);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});

describe("upstream non-2xx responses", () => {
  const unknownCursor = () => makeResponse({ message: "Unknown pagination cursor." }, { ok: false, status: 400 });
  const firstPageWithCursor = () =>
    makeResponse({
      properties: [{ id: "a" }],
      lastEvaluatedKey: { createdAt: 1700000000000, id: "cursor-id" },
    });

  let consoleErrorSpy;

  beforeEach(() => {
    jest.resetModules();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    delete globalThis.fetch;
  });

  test("fetchProperties rejects instead of returning an empty page on a 400", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(unknownCursor());
    const { fetchProperties } = await import(REPO_PATH);

    await expect(fetchProperties()).rejects.toThrow("failed to fetch properties");
  });

  test("fetchProperties logs the upstream status and keeps it as the error cause", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(unknownCursor());
    const { fetchProperties } = await import(REPO_PATH);

    const error = await fetchProperties().catch((err) => err);

    expect(error.cause.message).toContain("400");
    expect(consoleErrorSpy).toHaveBeenCalledWith("error fetching properties:", error.cause);
  });

  test("a 400 mid-walk rejects instead of returning the partial catalog", async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce(firstPageWithCursor())
      .mockResolvedValueOnce(unknownCursor());
    const { fetchAllProperties } = await import(REPO_PATH);

    await expect(fetchAllProperties()).rejects.toThrow("failed to fetch properties");

    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    const secondUrl = new URL(globalThis.fetch.mock.calls[1][0]);
    expect(secondUrl.searchParams.get("lastEvaluatedKeyCreatedAt")).toBe("1700000000000");
    expect(secondUrl.searchParams.get("lastEvaluatedKeyId")).toBe("cursor-id");
  });

  test("a failed walk is never cached, so the next call walks again and succeeds", async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce(firstPageWithCursor())
      .mockResolvedValueOnce(unknownCursor());
    const { fetchAllProperties } = await import(REPO_PATH);

    await expect(fetchAllProperties()).rejects.toThrow();

    globalThis.fetch.mockResolvedValue(makeResponse({ properties: [{ id: "a" }, { id: "b" }], lastEvaluatedKey: null }));
    const recovered = await fetchAllProperties();

    expect(recovered).toEqual([{ id: "a" }, { id: "b" }]);
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });
});
