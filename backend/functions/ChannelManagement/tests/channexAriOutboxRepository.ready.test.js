jest.mock("../../.shared/integrations/ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

import Database from "../../.shared/integrations/ORM/index.js";
import ChannexAriOutboxRepository from "../../.shared/channelManagement/repositories/channexAriOutboxRepository.js";

const createClient = (rows = []) => ({
  options: { schema: "main" },
  query: jest.fn(async () => rows),
});

const NOW = 1_750_000_000_000;

describe("ChannexAriOutboxRepository.findReadyProperties", () => {
  test("returns the properties oldest first, with their oldest waiting row", async () => {
    const client = createClient([
      { domitspropertyid: "property-1", oldestcreatedat: "1749999000000" },
      { domitspropertyid: "property-2", oldestcreatedat: "1749999500000" },
    ]);
    Database.getInstance.mockResolvedValue(client);

    const ready = await new ChannexAriOutboxRepository().findReadyProperties({ now: NOW });

    expect(ready).toEqual([
      { domitsPropertyId: "property-1", oldestCreatedAt: 1_749_999_000_000 },
      { domitsPropertyId: "property-2", oldestCreatedAt: 1_749_999_500_000 },
    ]);
  });

  test("asks only for PENDING rows, grouped per property, oldest first", async () => {
    const client = createClient();
    Database.getInstance.mockResolvedValue(client);

    await new ChannexAriOutboxRepository().findReadyProperties({ now: NOW, limit: 25 });

    const [sql, params] = client.query.mock.calls[0];
    expect(sql).toContain("main.channex_ari_outbox");
    expect(sql).toContain("GROUP BY domitspropertyid");
    expect(sql).toContain("ORDER BY oldestcreatedat ASC");
    expect(params[0]).toBe("PENDING");
    expect(params[params.length - 1]).toBe(25);
  });

  test("skips a property entirely while any of its rows waits for nextAttemptAt", async () => {
    const client = createClient();
    Database.getInstance.mockResolvedValue(client);

    await new ChannexAriOutboxRepository().findReadyProperties({ now: NOW });

    const [sql, params] = client.query.mock.calls[0];
    expect(sql).toContain("nextattemptat IS NOT NULL AND nextattemptat > $2");
    expect(sql).toContain("= 0");
    expect(params[1]).toBe(NOW);
  });

  test("treats bookings and Channex imports as ready without the quiet period", async () => {
    const client = createClient();
    Database.getInstance.mockResolvedValue(client);

    await new ChannexAriOutboxRepository().findReadyProperties({ now: NOW });

    const [sql, params] = client.query.mock.calls[0];
    expect(sql).toContain("source = ANY($3)");
    expect(params[2]).toEqual(["BOOKING", "CHANNEX_IMPORT"]);
  });

  test("uses the quiet period on the newest row and the cap on the oldest", async () => {
    const client = createClient();
    Database.getInstance.mockResolvedValue(client);

    await new ChannexAriOutboxRepository().findReadyProperties({ now: NOW, quietMs: 60_000, capMs: 300_000 });

    const [sql, params] = client.query.mock.calls[0];
    expect(sql).toContain("MAX(createdat) <= $4");
    expect(sql).toContain("MIN(createdat) <= $5");
    expect(params[3]).toBe(NOW - 60_000);
    expect(params[4]).toBe(NOW - 300_000);
  });

  test("falls back to the design defaults when the caller passes no timings", async () => {
    const client = createClient();
    Database.getInstance.mockResolvedValue(client);

    await new ChannexAriOutboxRepository().findReadyProperties({ now: NOW });

    const [, params] = client.query.mock.calls[0];
    expect(params[3]).toBe(NOW - 60_000);
    expect(params[4]).toBe(NOW - 300_000);
  });

  test("returns an empty list when no property is ready", async () => {
    Database.getInstance.mockResolvedValue(createClient([]));

    await expect(new ChannexAriOutboxRepository().findReadyProperties({ now: NOW })).resolves.toEqual([]);
  });
});
