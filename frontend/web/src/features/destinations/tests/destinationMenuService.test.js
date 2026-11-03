import {
  DESTINATION_MENU_FAILURE_PAUSE_MS,
  DESTINATION_MENU_TIMEOUT_MS,
  DESTINATION_MENU_TTL_MS,
  fetchDestinationMenu,
  forgetDestinationMenu,
  normalizeDestinationMenu,
} from "../services/destinationMenuService";

const jsonResponse = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });

const PAYLOAD = {
  continents: [
    {
      name: "Europe",
      path: "/destinations/europe",
      activeListings: "2",
      countries: [
        {
          name: "Spain",
          path: "/destinations/europe/spain",
          activeListings: 2,
          cities: [
            { name: "Marbella", path: "/destinations/europe/spain/marbella", activeListings: 2 },
            { name: "", path: "/destinations/europe/spain/nameless" },
            { name: "Elsewhere", path: "https://other.example/destinations/europe" },
            { name: "Upper", path: "/destinations/europe/spain/Ronda" },
            { name: "Up", path: "/destinations/europe/../spain" },
            { name: "Deep", path: "/destinations/europe/spain/marbella/old-town" },
          ],
        },
        { name: "Nowhere", path: "" },
        { name: "Protocol", path: "//other.example/destinations/europe/spain" },
      ],
    },
    { name: "Asia", path: "/destinations/asia" },
    { name: "Root", path: "/destinations" },
  ],
};

const NORMALIZED = [
  {
    name: "Europe",
    path: "/destinations/europe",
    activeListings: 2,
    countries: [
      {
        name: "Spain",
        path: "/destinations/europe/spain",
        activeListings: 2,
        cities: [{ name: "Marbella", path: "/destinations/europe/spain/marbella", activeListings: 2 }],
      },
    ],
  },
  { name: "Asia", path: "/destinations/asia", activeListings: 0, countries: [] },
];

const stalledFetch = () =>
  jest.fn(
    (_, { signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
      })
  );

describe("the destination menu service", () => {
  let warn;

  beforeEach(() => {
    forgetDestinationMenu();
    globalThis.fetch = jest.fn();
    warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    warn.mockRestore();
  });

  it("keeps only items that link to a destination page path and fills in the rest", () => {
    expect(normalizeDestinationMenu(PAYLOAD)).toEqual(NORMALIZED);
    expect(normalizeDestinationMenu(null)).toEqual([]);
    expect(normalizeDestinationMenu({ continents: "nope" })).toEqual([]);
  });

  it("asks once with a plain GET and shares the answer with every caller", async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(PAYLOAD));

    const [first, second] = await Promise.all([fetchDestinationMenu(), fetchDestinationMenu()]);

    expect(first).toEqual(NORMALIZED);
    expect(second).toBe(first);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = globalThis.fetch.mock.calls[0];
    expect(url).toMatch(/^https:\/\/[^/]+\/default\/property\/destinations\/menu$/);
    expect(Object.keys(options)).toEqual(["signal"]);
  });

  it("answers an empty list while the destination pages are switched off", async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse({ continents: [] }));
    expect(await fetchDestinationMenu()).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
  });

  it("gives up on a call that does not answer in time and answers an empty list", async () => {
    jest.useFakeTimers();
    globalThis.fetch = stalledFetch();

    const pending = fetchDestinationMenu();
    jest.advanceTimersByTime(DESTINATION_MENU_TIMEOUT_MS - 1);
    expect(globalThis.fetch.mock.calls[0][1].signal.aborted).toBe(false);
    jest.advanceTimersByTime(1);

    await expect(pending).resolves.toEqual([]);
    expect(globalThis.fetch.mock.calls[0][1].signal.aborted).toBe(true);
    expect(warn).toHaveBeenCalledWith("The destinations menu is not available:", "AbortError", "aborted");
    expect(DESTINATION_MENU_TIMEOUT_MS).toBe(8000);
  });

  it.each([
    ["a 503", () => Promise.resolve(jsonResponse({ message: "later" }, 503))],
    ["an unexpected shape", () => Promise.resolve(jsonResponse({ message: "unexpected" }))],
    ["a network failure", () => Promise.reject(new TypeError("Failed to fetch"))],
  ])("answers an empty list for %s and asks again only after a pause", async (_, failure) => {
    jest.useFakeTimers();
    globalThis.fetch.mockImplementationOnce(failure).mockResolvedValue(jsonResponse(PAYLOAD));

    expect(await fetchDestinationMenu()).toEqual([]);
    jest.advanceTimersByTime(DESTINATION_MENU_FAILURE_PAUSE_MS - 1);
    expect(await fetchDestinationMenu()).toEqual([]);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1);
    expect(await fetchDestinationMenu()).toEqual(NORMALIZED);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(DESTINATION_MENU_FAILURE_PAUSE_MS).toBe(60000);
  });

  it("keeps a menu for five minutes and asks again after that", async () => {
    jest.useFakeTimers();
    globalThis.fetch.mockResolvedValue(jsonResponse(PAYLOAD));

    await fetchDestinationMenu();
    jest.advanceTimersByTime(DESTINATION_MENU_TTL_MS - 1);
    await fetchDestinationMenu();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1);
    await fetchDestinationMenu();
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(DESTINATION_MENU_TTL_MS).toBe(300000);
  });
});
