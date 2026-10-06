import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import Database from "database";
import {
  DestinationPageRepository,
  buildAccommodationImageUrl,
} from "../../functions/PropertyHandler/data/repository/destinationPageRepository.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const SCHEMA = process.env.TEST === "true" ? "test" : "main";

const withRows = (rows) => {
  const query = jest.fn(async () => rows);
  Database.getInstance.mockResolvedValue({ options: { schema: "main" }, query });
  return query;
};

describe("the destination page repository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists every destination with the number of active properties mapped to it", async () => {
    const query = withRows([
      {
        id: "/destinations/europe/spain/marbella",
        type: "city",
        parent_id: "/destinations/europe/spain",
        slug: "marbella",
        path: "/destinations/europe/spain/marbella",
        display_name: "Marbella",
        country_code: "ES",
        active_listings: "2",
      },
      {
        id: "/destinations/europe",
        type: "continent",
        parent_id: null,
        slug: "europe",
        path: "/destinations/europe",
        display_name: "Europe",
        country_code: null,
        active_listings: "0",
      },
    ]);

    const destinations = await new DestinationPageRepository().listDestinationsWithActiveListings();

    expect(destinations[0]).toEqual({
      id: "/destinations/europe/spain/marbella",
      type: "city",
      parentId: "/destinations/europe/spain",
      slug: "marbella",
      path: "/destinations/europe/spain/marbella",
      name: "Marbella",
      countryCode: "ES",
      activeListings: 2,
    });
    expect(destinations[1]).toMatchObject({ parentId: null, countryCode: null, activeListings: 0 });
    const [statement, parameters] = query.mock.calls[0];
    expect(statement).toContain(`LEFT JOIN ${SCHEMA}.property p ON p.id = m.property_id AND p.status = $1`);
    expect(statement).toContain("count(p.id) AS active_listings");
    expect(parameters).toEqual(["ACTIVE"]);
  });

  it("lists the active listings under a path with their public fields and the first ready web image only", async () => {
    const query = withRows([
      {
        id: "p1",
        title: "Villa",
        city: "Marbella",
        country: "Spain",
        roomrate: "240",
        path: "/destinations/europe/spain/marbella",
        image_key: "images/p1/web.jpg",
      },
      {
        id: "p2",
        title: "Flat",
        city: "Málaga",
        country: "Spain",
        roomrate: null,
        path: "/destinations/europe/spain/malaga",
        image_key: null,
      },
    ]);

    const listings = await new DestinationPageRepository().listActiveListingsUnderPath("/destinations/europe/spain");

    expect(listings).toEqual([
      {
        id: "p1",
        title: "Villa",
        city: "Marbella",
        country: "Spain",
        nightlyRate: 240,
        imageUrl: "https://accommodation.s3.eu-north-1.amazonaws.com/images/p1/web.jpg",
        destinationPath: "/destinations/europe/spain/marbella",
      },
      {
        id: "p2",
        title: "Flat",
        city: "Málaga",
        country: "Spain",
        nightlyRate: 0,
        imageUrl: "",
        destinationPath: "/destinations/europe/spain/malaga",
      },
    ]);
    const [statement, parameters] = query.mock.calls[0];
    expect(statement).toContain("p.status = $1");
    expect(statement).toContain("WHERE d.path = $2 OR d.path LIKE $3");
    expect(statement).toContain("v.variant = 'web'");
    expect(statement).toContain("i.status = 'READY'");
    expect(statement).not.toMatch(/street|postal|house|hostid|latitude/i);
    expect(parameters).toEqual(["ACTIVE", "/destinations/europe/spain", "/destinations/europe/spain/%"]);
  });

  it("answers an empty list for an empty path without asking the database", async () => {
    const query = withRows([]);
    expect(await new DestinationPageRepository().listActiveListingsUnderPath("  ")).toEqual([]);
    expect(query).not.toHaveBeenCalled();
  });

  it("builds image urls from the accommodation bucket and nothing for an empty key", () => {
    expect(buildAccommodationImageUrl("/images/p1/web.jpg")).toBe(
      "https://accommodation.s3.eu-north-1.amazonaws.com/images/p1/web.jpg"
    );
    expect(buildAccommodationImageUrl("")).toBe("");
    expect(buildAccommodationImageUrl(null)).toBe("");
  });
});
