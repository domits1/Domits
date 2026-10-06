import { describe, expect, it, jest } from "@jest/globals";
import {
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

const buildService = ({ rows = ROWS, listings = [LISTING], settings = readDestinationSettings({}) } = {}) => {
  const repository = {
    listDestinationsWithActiveListings: jest.fn(async () => rows),
    listActiveListingsUnderPath: jest.fn(async () => listings),
  };
  return { service: new DestinationTreeService({ destinationPageRepository: repository, settings }), repository };
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

  it("renders the sitemap from the same eligibility as the pages", async () => {
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
    expect(repository.listActiveListingsUnderPath).toHaveBeenCalledWith("/destinations/europe/spain");

    expect(await service.renderDestinationPage("/destinations/europe/portugal")).toBeNull();
    expect(await service.renderDestinationPage("/destinations/europe/spain/ronda")).toBeNull();
    expect(await service.renderDestinationPage("/destinations/nowhere")).toBeNull();
    expect(repository.listActiveListingsUnderPath).toHaveBeenCalledTimes(1);
  });

  it("lets a repository failure reach the caller instead of rendering an empty page", async () => {
    const { service, repository } = buildService();
    repository.listDestinationsWithActiveListings.mockRejectedValue(new Error("connection refused"));
    await expect(service.renderDestinationPage("/destinations/europe/spain")).rejects.toThrow("connection refused");
  });
});
