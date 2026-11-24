jest.mock("../../.shared/integrations/ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

import Database from "../../.shared/integrations/ORM/index.js";
import ListingDistributionRepository from "../../.shared/channelManagement/repositories/listingDistributionRepository.js";

const setup = (rows) => {
  const client = { options: { schema: "main" }, query: jest.fn().mockResolvedValue(rows) };
  Database.getInstance.mockResolvedValue(client);
  return { repository: new ListingDistributionRepository(), client };
};

// One row as the database returns it: the listing joined with its location, "Guests" detail and price.
const listingRow = (overrides = {}) => ({
  id: "property-1",
  hostid: "host-1",
  status: "ACTIVE",
  title: "Villa Malee",
  type: "Villa",
  country: "Netherlands",
  city: "Haarlem",
  street: "Grote Markt",
  housenumber: 12,
  housenumberextension: "B",
  postalcode: "2011RD",
  latitude: "52.3812",
  longitude: "4.6365",
  guests: 4,
  roomrate: 150,
  ...overrides,
});

describe("ListingDistributionRepository.findListing", () => {
  beforeEach(() => jest.clearAllMocks());

  // Readiness (D3) and the Channex payloads (D2) both read this shape (#4031 review: the title was missing).
  test("returns the listing in the shape readiness and the Channex payloads read", async () => {
    const { repository } = setup([listingRow()]);

    await expect(repository.findListing("property-1")).resolves.toEqual({
      propertyId: "property-1",
      hostId: "host-1",
      status: "ACTIVE",
      title: "Villa Malee",
      propertyType: "Villa",
      location: {
        country: "Netherlands",
        city: "Haarlem",
        street: "Grote Markt",
        houseNumber: 12,
        houseNumberExtension: "B",
        postalCode: "2011RD",
        latitude: 52.3812,
        longitude: 4.6365,
      },
      guests: 4,
      roomRate: 150,
    });
  });

  test("joins the property type", async () => {
    const { repository, client } = setup([listingRow()]);

    await repository.findListing("property-1");

    expect(client.query.mock.calls[0][0]).toContain('LEFT JOIN "test"."property_type"');
  });

  test("returns null when the listing does not exist, so the route can answer 404", async () => {
    const { repository } = setup([]);

    await expect(repository.findListing("missing")).resolves.toBeNull();
  });

  // The readiness check is strict about numbers; a driver that returns numeric columns
  // as strings must not make every listing look incomplete.
  test("turns numeric strings into numbers", async () => {
    const { repository } = setup([listingRow({ guests: "4", roomrate: "150" })]);

    const listing = await repository.findListing("property-1");

    expect(listing.guests).toBe(4);
    expect(listing.roomRate).toBe(150);
  });

  test("a listing without location, guests or price row comes back with nulls, not zeros", async () => {
    const { repository } = setup([listingRow({ country: null, city: null, street: null, housenumber: null, housenumberextension: null, postalcode: null, latitude: null, longitude: null, guests: null, roomrate: null })]);

    await expect(repository.findListing("property-1")).resolves.toMatchObject({
      location: null,
      guests: null,
      roomRate: null,
    });
  });

  // npm test sets TEST=true, which points every query at the test schema.
  test("reads one listing by id from the schema-qualified tables", async () => {
    const { repository, client } = setup([listingRow()]);

    await repository.findListing("property-1");

    const [sql, params] = client.query.mock.calls[0];
    expect(params).toEqual(["property-1"]);
    expect(sql).toContain('FROM "test"."property"');
    expect(sql).toContain('LEFT JOIN "test"."property_location"');
    expect(sql).toContain('LEFT JOIN "test"."property_generaldetail"');
    expect(sql).toContain("'Guests'");
    expect(sql).toContain('LEFT JOIN "test"."property_pricing"');
  });
});
