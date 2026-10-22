import { describe, expect, it, jest } from "@jest/globals";
import {
  DESTINATION_TREE_READ_TIMEOUT_MS,
  DESTINATION_TREE_TTL_MS,
  DestinationTreeService,
  buildDestinationTree,
} from "../../functions/PropertyHandler/business/service/destinationTreeService.js";
import { readDestinationSettings } from "../../functions/PropertyHandler/util/destination/destinationSettings.js";

const row = (path, type, parentId, name, activeListings = 0) => ({
  id: path,
  type,
  parentId,
  slug: path.split("/").pop(),
  path,
  name,
  countryCode: type === "continent" ? null : "ES",
  activeListings,
});

const ROWS = [
  row("/destinations/europe", "continent", null, "Europe"),
  row("/destinations/europe/spain", "country", "/destinations/europe", "Spain"),
  row("/destinations/europe/spain/marbella", "city", "/destinations/europe/spain", "Marbella", 2),
  row("/destinations/europe/spain/malaga", "city", "/destinations/europe/spain", "Málaga", 1),
  row("/destinations/europe/spain/ronda", "city", "/destinations/europe/spain", "Ronda", 0),
  row("/destinations/europe/portugal", "country", "/destinations/europe", "Portugal"),
  row("/destinations/europe/portugal/sintra", "city", "/destinations/europe/portugal", "Sintra", 0),
  row("/destinations/asia", "continent", null, "Asia"),
];

const LISTING = {
  id: "p1",
  title: "Villa",
  city: "Marbella",
  country: "Spain",
  nightlyRate: 200,
  imageUrl: "",
  destinationPath: "/destinations/europe/spain/marbella",
};

const buildService = ({
  rows = ROWS,
  listings = [LISTING],
  settings = readDestinationSettings({}),
  clock = { now: 0 },
} = {}) => {
  const repository = {
    listDestinationsWithActiveListings: jest.fn(async () => rows),
    listActiveListingsUnderPath: jest.fn(async () => listings),
  };
  return {
    service: new DestinationTreeService({ destinationPageRepository: repository, settings, now: () => clock.now }),
    repository,
    clock,
  };
};

describe("the destination tree", () => {
  it("adds the listings up the tree and lets a parent exist through its children", () => {
    const tree = buildDestinationTree(ROWS, readDestinationSettings({}));
    const byPath = Object.fromEntries(tree.map((destination) => [destination.path, destination]));

    expect(byPath["/destinations/europe"].totalListings).toBe(3);
    expect(byPath["/destinations/europe/spain"].totalListings).toBe(3);
    expect(byPath["/destinations/europe/spain"].eligible).toBe(true);
    expect(byPath["/destinations/europe/spain/ronda"].eligible).toBe(false);
    expect(byPath["/destinations/europe/portugal"].eligible).toBe(false);
    expect(byPath["/destinations/europe/portugal/sintra"].eligible).toBe(false);
    expect(byPath["/destinations/asia"].eligible).toBe(false);
    const paths = tree.map((destination) => destination.path);
    expect(paths).toEqual([...paths].sort((left, right) => left.localeCompare(right)));
  });

  it("applies a higher minimum per destination while a country keeps counting all its stays", () => {
    const tree = buildDestinationTree(ROWS, readDestinationSettings({ DESTINATION_MIN_ACTIVE_LISTINGS: "2" }));
    const byPath = Object.fromEntries(tree.map((destination) => [destination.path, destination]));

    expect(byPath["/destinations/europe/spain/marbella"].eligible).toBe(true);
    expect(byPath["/destinations/europe/spain/malaga"].eligible).toBe(false);
    expect(byPath["/destinations/europe/spain"].eligible).toBe(true);
  });

  it("lets a country exist only through the listings mapped to the country itself when the parent setting is off", () => {
    const settings = readDestinationSettings({
      DESTINATION_MIN_ACTIVE_LISTINGS: "2",
      DESTINATION_PARENT_FROM_ANY_CHILD: "false",
    });
    const rows = ROWS.map((candidate) =>
      candidate.path === "/destinations/europe/portugal" ? { ...candidate, activeListings: 2 } : candidate
    );
    const tree = buildDestinationTree(rows, settings);
    const byPath = Object.fromEntries(tree.map((destination) => [destination.path, destination]));

    expect(byPath["/destinations/europe/spain/marbella"].eligible).toBe(true);
    expect(byPath["/destinations/europe/spain"].eligible).toBe(false);
    expect(byPath["/destinations/europe/portugal"].eligible).toBe(true);
    expect(byPath["/destinations/europe"].eligible).toBe(false);
  });

  it("leaves an ancestor without a page out of the breadcrumbs", async () => {
    const settings = readDestinationSettings({
      DESTINATION_MIN_ACTIVE_LISTINGS: "2",
      DESTINATION_PARENT_FROM_ANY_CHILD: "false",
    });
    const { service } = buildService({ settings });

    const page = await service.renderDestinationPage("/destinations/europe/spain/marbella");

    expect(page.html).toContain('<a href="/destinations">Destinations</a>');
    expect(page.html).not.toContain('href="/destinations/europe"');
    expect(page.html).not.toContain('href="/destinations/europe/spain"');
    expect(page.html).toContain('<li aria-current="page">Marbella</li>');
    expect(await service.renderDestinationPage("/destinations/europe/spain")).toBeNull();
  });

  it("gives a flagged city no page while its listings still count for the country", () => {
    const rows = [
      row("/destinations/africa", "continent", null, "Africa"),
      row("/destinations/africa/kenya", "country", "/destinations/africa", "Kenya"),
      row("/destinations/africa/kenya/kenya", "city", "/destinations/africa/kenya", "kenya", 1),
      row("/destinations/europe", "continent", null, "Europe"),
      row("/destinations/europe/italy", "country", "/destinations/europe", "Italy"),
      row("/destinations/europe/italy/lucca", "city", "/destinations/europe/italy", "lucca", 1),
      row("/destinations/europe/italy/modica", "city", "/destinations/europe/italy", "Modica", 1),
    ];
    const byPath = Object.fromEntries(buildDestinationTree(rows, readDestinationSettings({})).map((d) => [d.path, d]));

    expect(byPath["/destinations/africa/kenya/kenya"].eligible).toBe(false);
    expect(byPath["/destinations/europe/italy/lucca"].eligible).toBe(false);
    expect(byPath["/destinations/europe/italy/modica"].eligible).toBe(true);
    expect(byPath["/destinations/africa/kenya"].eligible).toBe(true);
    expect(byPath["/destinations/africa/kenya"].totalListings).toBe(1);
  });

  it("refuses a tree with a cycle instead of running out of stack", () => {
    const loop = [
      row("/destinations/a", "continent", "/destinations/a/b", "A"),
      row("/destinations/a/b", "country", "/destinations/a", "B", 1),
    ];
    expect(() => buildDestinationTree(loop, readDestinationSettings({}))).toThrow("has a cycle at");
  });

  it("lists only the destinations that have a page", async () => {
    const { service } = buildService();
    expect((await service.listEligibleDestinations()).map((destination) => destination.path)).toEqual([
      "/destinations/europe",
      "/destinations/europe/spain",
      "/destinations/europe/spain/malaga",
      "/destinations/europe/spain/marbella",
    ]);
  });

  it("renders the sitemap from the same eligibility as the pages, so mapping rows without an active property put nothing in it", async () => {
    const { service } = buildService();
    const xml = await service.renderDestinationSitemap({
      siteOrigin: "https://www.domits.com",
      lastModified: "2026-10-07",
    });
    expect(xml.match(/<loc>/g)).toHaveLength(4);
    expect(xml).toContain(
      "<loc>https://www.domits.com/destinations/europe/spain/malaga</loc><lastmod>2026-10-07</lastmod>"
    );
    expect(xml).not.toContain("ronda");
    expect(xml).not.toContain("portugal");
    const stale = buildService({ rows: ROWS.map((candidate) => ({ ...candidate, activeListings: 0 })) });
    expect(await stale.service.renderDestinationSitemap()).toBeNull();
    expect(await service.renderDestinationSitemap()).not.toContain("lastmod");

    const empty = buildService({ rows: [] });
    expect(await empty.service.renderDestinationSitemap()).toBeNull();
  });

  it("renders a page with its parents and eligible children, and answers null for a destination without a page", async () => {
    const { service, repository } = buildService();

    const page = await service.renderDestinationPage("/destinations/europe/spain", {
      siteOrigin: "https://www.domits.com",
    });

    expect(page.title).toBe("Holiday rentals in Spain | Domits");
    expect(page.html).toContain('<a href="/destinations/europe">Europe</a>');
    expect(page.html).toContain("Marbella");
    expect(page.html).toContain("Málaga");
    expect(page.html).not.toContain("Ronda");
    expect(repository.listActiveListingsUnderPath).toHaveBeenCalledWith("/destinations/europe/spain", 24);

    expect(await service.renderDestinationPage("/destinations/europe/portugal")).toBeNull();
    expect(await service.renderDestinationPage("/destinations/europe/spain/ronda")).toBeNull();
    expect(await service.renderDestinationPage("/destinations/nowhere")).toBeNull();
    expect(repository.listActiveListingsUnderPath).toHaveBeenCalledTimes(1);
  });

  it("asks for the first 24 listings and still counts every active listing under the destination", async () => {
    const rows = ROWS.map((destination) =>
      destination.path === "/destinations/europe/spain/marbella" ? { ...destination, activeListings: 25 } : destination
    );
    const firstPage = Array.from({ length: 24 }, (_, index) => ({ ...LISTING, id: `p${index}` }));
    const { service, repository } = buildService({ rows, listings: firstPage });

    const page = await service.renderDestinationPage("/destinations/europe/spain/marbella");

    expect(repository.listActiveListingsUnderPath).toHaveBeenCalledWith("/destinations/europe/spain/marbella", 24);
    expect(page.html.match(/<li class="listing">/g)).toHaveLength(24);
    expect(page.description).toContain("25 holiday rentals");
  });

  it("answers null instead of an empty page when the listings are gone between the count and the listing read", async () => {
    const { service, repository } = buildService();
    repository.listActiveListingsUnderPath.mockResolvedValue([]);
    expect(await service.renderDestinationPage("/destinations/europe/spain")).toBeNull();
  });

  it("answers a made up path from the tree it read within the last minute, without asking the database again", async () => {
    const { service, repository, clock } = buildService();

    await service.renderDestinationPage("/destinations/europe/spain");
    clock.now = DESTINATION_TREE_TTL_MS - 1;
    expect(await service.renderDestinationPage("/destinations/europe/spain/nowhere")).toBeNull();
    expect(await service.renderDestinationPage("/destinations/aaa/bbb/ccc")).toBeNull();
    expect(await service.renderDestinationSitemap({ siteOrigin: "https://www.domits.com" })).toContain("<urlset");

    expect(repository.listDestinationsWithActiveListings).toHaveBeenCalledTimes(1);
    expect(repository.listActiveListingsUnderPath).toHaveBeenCalledTimes(1);
  });

  it("reads the tree again once a minute has passed", async () => {
    const { service, repository, clock } = buildService();
    await service.renderDestinationPage("/destinations/aaa");
    clock.now = DESTINATION_TREE_TTL_MS;
    await service.renderDestinationPage("/destinations/aaa");
    expect(repository.listDestinationsWithActiveListings).toHaveBeenCalledTimes(2);
  });

  it("shares one tree read between two pages asked at the same time", async () => {
    const { service, repository } = buildService();
    const pages = await Promise.all([
      service.renderDestinationPage("/destinations/europe/spain"),
      service.renderDestinationPage("/destinations/europe/spain/marbella"),
    ]);
    expect(pages.every(Boolean)).toBe(true);
    expect(repository.listDestinationsWithActiveListings).toHaveBeenCalledTimes(1);
  });

  it("does not keep a failed tree read, so the next page reads it again", async () => {
    const { service, repository } = buildService();
    repository.listDestinationsWithActiveListings.mockRejectedValueOnce(new Error("connection refused"));
    await expect(service.renderDestinationPage("/destinations/europe/spain")).rejects.toThrow("connection refused");
    expect(await service.renderDestinationPage("/destinations/europe/spain")).not.toBeNull();
    expect(repository.listDestinationsWithActiveListings).toHaveBeenCalledTimes(2);
  });

  it("gives up on a tree read that hangs, so the next page reads the tree again", async () => {
    jest.useFakeTimers();
    const { service, repository } = buildService();
    repository.listDestinationsWithActiveListings.mockImplementationOnce(() => new Promise(() => {}));

    const hanging = expect(service.renderDestinationPage("/destinations/europe/spain")).rejects.toThrow(
      `The read took longer than ${DESTINATION_TREE_READ_TIMEOUT_MS} ms.`
    );
    await jest.advanceTimersByTimeAsync(DESTINATION_TREE_READ_TIMEOUT_MS);
    await hanging;

    expect(await service.renderDestinationPage("/destinations/europe/spain")).not.toBeNull();
    expect(repository.listDestinationsWithActiveListings).toHaveBeenCalledTimes(2);
    expect(repository.listActiveListingsUnderPath).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it("lets a repository failure reach the caller instead of rendering an empty page", async () => {
    const { service, repository } = buildService();
    repository.listDestinationsWithActiveListings.mockRejectedValue(new Error("connection refused"));
    await expect(service.renderDestinationPage("/destinations/europe/spain")).rejects.toThrow("connection refused");
  });
});
