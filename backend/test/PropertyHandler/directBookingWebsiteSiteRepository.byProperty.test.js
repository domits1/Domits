import { describe, expect, it, jest } from "@jest/globals";
import Database from "database";
import { DirectBookingWebsiteSiteRepository } from "../../functions/PropertyHandler/data/repository/directBookingWebsiteSiteRepository.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const SITE_ROW = {
  id: "site-1",
  property_id: "property-1",
  host_id: "host-1",
  site_name: "Cliff House",
  primary_locale: "en",
  status: "PUBLISHED",
  template_key: "panorama",
  published_property_snapshot_json: "{}",
  published_content_overrides_json: "{}",
  published_theme_overrides_json: "{}",
  preview_token_hash: null,
  published_at: 1757000000000,
  suspended_at: null,
  created_at: 1756000000000,
  updated_at: 1757000000000,
};

const withRows = (rows) => {
  const client = { options: { schema: "main" }, query: jest.fn(async () => rows) };
  Database.getInstance.mockResolvedValue(client);
  return client;
};

describe("DirectBookingWebsiteSiteRepository.getSiteByPropertyId", () => {
  it("selects the site by property id alone and maps the row", async () => {
    const client = withRows([SITE_ROW]);

    const site = await new DirectBookingWebsiteSiteRepository().getSiteByPropertyId("property-1");

    const [statement, parameters] = client.query.mock.calls[0];
    expect(statement).toContain("WHERE property_id = $1");
    expect(statement).not.toContain("host_id = $");
    expect(parameters).toEqual(["property-1"]);
    expect(site).toMatchObject({ id: "site-1", propertyId: "property-1", hostId: "host-1", status: "PUBLISHED" });
  });

  it("returns null when the property has no site", async () => {
    withRows([]);

    await expect(new DirectBookingWebsiteSiteRepository().getSiteByPropertyId("property-2")).resolves.toBeNull();
  });
});
