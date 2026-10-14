jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const Database = require("database").default;
const StandaloneSiteRepository =
  require("../../functions/General-Bookings-CRUD-Bookings-develop/data/standaloneSiteRepository.js").default;
const StandaloneSiteEventRepository =
  require("../../functions/General-Bookings-CRUD-Bookings-develop/data/standaloneSiteEventRepository.js").default;

const buildClient = (rows) => ({
  query: jest.fn(async () => rows),
  options: { schema: "main" },
});

describe("StandaloneSiteRepository.getSiteById", () => {
  test("reads the site row by id and maps it to camelCase", async () => {
    const client = buildClient([{ id: "site-1", property_id: "property-1", host_id: "host-1", status: "PUBLISHED" }]);
    Database.getInstance.mockResolvedValue(client);

    const site = await new StandaloneSiteRepository().getSiteById("site-1");

    expect(site).toEqual({ id: "site-1", propertyId: "property-1", hostId: "host-1", status: "PUBLISHED" });
    const [sql, params] = client.query.mock.calls[0];
    expect(sql).toMatch(/standalone_site/);
    expect(sql).toMatch(/WHERE id = \$1/);
    expect(params).toEqual(["site-1"]);
  });

  test("returns null when no row matches", async () => {
    Database.getInstance.mockResolvedValue(buildClient([]));
    await expect(new StandaloneSiteRepository().getSiteById("missing")).resolves.toBeNull();
  });

  test("returns null for a blank id without querying", async () => {
    const client = buildClient([]);
    Database.getInstance.mockResolvedValue(client);
    await expect(new StandaloneSiteRepository().getSiteById("  ")).resolves.toBeNull();
    expect(client.query).not.toHaveBeenCalled();
  });
});

describe("StandaloneSiteEventRepository.recordEvent", () => {
  test("inserts one event row attributed to the site owner", async () => {
    const client = buildClient([]);
    Database.getInstance.mockResolvedValue(client);

    await new StandaloneSiteEventRepository().recordEvent({
      propertyId: "property-1",
      hostId: "host-1",
      eventType: "SITE_BOOKING_REQUESTED",
      payload: { requestId: "req-1", publicBookingRef: "DBW-ABCDEFGHJK" },
      occurredAt: 1789000000000,
    });

    const [sql, params] = client.query.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO .*standalone_site_event/);
    expect(sql).toMatch(/draft_id, property_id, host_id, event_type, payload_json, occurred_at/);
    expect(params[0]).toEqual(expect.any(String));
    expect(params.slice(1)).toEqual([
      null,
      "property-1",
      "host-1",
      "SITE_BOOKING_REQUESTED",
      JSON.stringify({ requestId: "req-1", publicBookingRef: "DBW-ABCDEFGHJK" }),
      1789000000000,
    ]);
  });
});
