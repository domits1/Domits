import {
  fetchDestinationMenu,
  forgetDestinationMenu,
  normalizeDestinationMenu,
} from "../services/destinationMenuService";

const jsonResponse = (body, ok = true) => ({ ok, status: ok ? 200 : 500, json: async () => body });

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
            { name: "Elsewhere", path: "https://evil.example/phish" },
          ],
        },
        { name: "Nowhere", path: "" },
      ],
    },
    { name: "Asia", path: "/destinations/asia" },
  ],
};

describe("the destination menu service", () => {
  beforeEach(() => {
    forgetDestinationMenu();
    globalThis.fetch = jest.fn();
  });

  it("keeps only items that carry a destination page path and fills in the rest", () => {
    expect(normalizeDestinationMenu(PAYLOAD)).toEqual([
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
    ]);
    expect(normalizeDestinationMenu(null)).toEqual([]);
    expect(normalizeDestinationMenu({ continents: "nope" })).toEqual([]);
  });

  it("fetches once and shares the answer with every caller", async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(PAYLOAD));

    const [first, second] = await Promise.all([fetchDestinationMenu(), fetchDestinationMenu()]);
    expect(first).toBe(second);
    expect(await fetchDestinationMenu()).toBe(first);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch.mock.calls[0][0]).toMatch(/\/property\/destinations\/menu$/);
  });

  it("forgets a failed, malformed or stalled load so the next call tries again", async () => {
    jest.useFakeTimers();
    globalThis.fetch
      .mockResolvedValueOnce(jsonResponse({ message: "down" }, false))
      .mockResolvedValueOnce(jsonResponse({ message: "unexpected" }))
      .mockReturnValueOnce(new Promise(() => {}))
      .mockResolvedValueOnce(jsonResponse(PAYLOAD));

    await expect(fetchDestinationMenu()).rejects.toThrow("500");
    await expect(fetchDestinationMenu()).rejects.toThrow("unexpected shape");
    const stalled = fetchDestinationMenu();
    jest.advanceTimersByTime(10_000);
    await expect(stalled).rejects.toThrow("did not answer in time");
    expect((await fetchDestinationMenu())[0].name).toBe("Europe");
    expect(globalThis.fetch).toHaveBeenCalledTimes(4);
    jest.useRealTimers();
  });

  it("asks again after five minutes so a destination that lost its page drops out", async () => {
    jest.useFakeTimers();
    globalThis.fetch.mockResolvedValue(jsonResponse(PAYLOAD));

    await fetchDestinationMenu();
    jest.advanceTimersByTime(5 * 60 * 1000);
    await fetchDestinationMenu();
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });
});
