const REPO_PATH =
  "../../functions/General-Accommodation-FilterFunction/data/propertyRepository.mjs";

const makeResponse = (body) => ({
  json: async () => body,
});

// One page of properties, no pagination key — keeps fetchAllProperties to a
// single upstream call per cold fetch.
const singlePage = () => makeResponse({ properties: [{ id: "a" }], lastEvaluatedKey: null });

describe("fetchAllProperties catalog cache", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue(singlePage());
  });

  afterEach(() => {
    jest.useRealTimers();
    delete global.fetch;
  });

  test("serves a warm cache without re-fetching within the TTL", async () => {
    const { fetchAllProperties } = await import(REPO_PATH);

    const first = await fetchAllProperties();
    const second = await fetchAllProperties();

    expect(second).toEqual(first);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("re-fetches once the TTL has elapsed", async () => {
    const { fetchAllProperties } = await import(REPO_PATH);

    await fetchAllProperties();
    jest.advanceTimersByTime(60_001);
    await fetchAllProperties();

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test("dedupes concurrent cold fetches into a single download", async () => {
    const { fetchAllProperties } = await import(REPO_PATH);

    await Promise.all([fetchAllProperties(), fetchAllProperties(), fetchAllProperties()]);

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
