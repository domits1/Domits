import { describe, expect, it } from "@jest/globals";
import { buildDestinationMenu } from "../../functions/PropertyHandler/business/service/destinationMenuBuilder.js";
import { buildDestinationTree } from "../../functions/PropertyHandler/business/service/destinationTreeService.js";
import { readDestinationSettings } from "../../functions/PropertyHandler/util/destination/destinationSettings.js";

const row = (path, type, parentId, name, activeListings = 0) => ({
  id: path,
  type,
  parentId,
  slug: path.split("/").pop(),
  path,
  name,
  countryCode: null,
  activeListings,
});

const ROWS = [
  row("/destinations/europe", "continent", null, "Europe"),
  row("/destinations/europe/spain", "country", "/destinations/europe", "Spain"),
  row("/destinations/europe/spain/marbella", "city", "/destinations/europe/spain", "Marbella", 2),
  row("/destinations/europe/spain/malaga", "city", "/destinations/europe/spain", "Málaga", 1),
  row("/destinations/europe/spain/ronda", "city", "/destinations/europe/spain", "Ronda", 0),
  row("/destinations/europe/portugal", "country", "/destinations/europe", "Portugal"),
  row("/destinations/europe/portugal/sintra", "city", "/destinations/europe/portugal", "Sintra", 4),
  row("/destinations/europe/portugal/lisbon", "city", "/destinations/europe/portugal", "Lisbon", 4),
  row("/destinations/asia", "continent", null, "Asia"),
  row("/destinations/asia/thailand", "country", "/destinations/asia", "Thailand"),
  row("/destinations/asia/thailand/koh-samui", "city", "/destinations/asia/thailand", "Koh Samui", 3),
];

const menuFor = (env, rows = ROWS) => {
  const settings = readDestinationSettings(env);
  return buildDestinationMenu(buildDestinationTree(rows, settings), settings);
};

const names = (items) => items.map((item) => item.name);

describe("the destination menu", () => {
  it("lists only destinations with a page, most listings first, ties by name", () => {
    const menu = menuFor({});

    expect(names(menu.continents)).toEqual(["Europe", "Asia"]);
    const [europe] = menu.continents;
    expect(names(europe.countries)).toEqual(["Portugal", "Spain"]);
    expect(names(europe.countries[0].cities)).toEqual(["Lisbon", "Sintra"]);
    expect(names(europe.countries[1].cities)).toEqual(["Marbella", "Málaga"]);
    expect(europe.countries[1].cities[0]).toEqual({
      name: "Marbella",
      path: "/destinations/europe/spain/marbella",
      activeListings: 2,
    });
    expect(europe).toMatchObject({ path: "/destinations/europe", activeListings: 11 });
    expect(Object.keys(europe)).toEqual(["name", "path", "activeListings", "countries"]);
  });

  it("puts the featured countries and cities first in the order given and ignores unknown slugs", () => {
    const menu = menuFor({ DESTINATION_FEATURED: "atlantis, Spain, Málaga" });

    const [europe] = menu.continents;
    expect(names(europe.countries)).toEqual(["Spain", "Portugal"]);
    expect(names(europe.countries[0].cities)).toEqual(["Málaga", "Marbella"]);
  });

  it("keeps a flagged city and a country below the minimum out of the menu", () => {
    const menu = menuFor({ DESTINATION_MIN_ACTIVE_LISTINGS: "3" }, [
      ...ROWS,
      row("/destinations/asia/thailand/kenya", "city", "/destinations/asia/thailand", "kenya", 9),
    ]);

    const asia = menu.continents.find((continent) => continent.name === "Asia");
    const europe = menu.continents.find((continent) => continent.name === "Europe");
    expect(names(asia.countries[0].cities)).toEqual(["Koh Samui"]);
    expect(names(europe.countries)).toEqual(["Portugal", "Spain"]);
    expect(names(europe.countries[1].cities)).toEqual([]);
  });

  it("answers an empty menu for no destinations and for destinations without listings", () => {
    expect(buildDestinationMenu([], readDestinationSettings({}))).toEqual({ continents: [] });
    expect(menuFor({}, [row("/destinations/europe", "continent", null, "Europe")])).toEqual({ continents: [] });
  });
});
