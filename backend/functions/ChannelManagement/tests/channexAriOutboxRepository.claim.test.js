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
const RUN_STARTED_AT = NOW - 1_000;

describe("ChannexAriOutboxRepository.claim", () => {
  test("returns the claimed rows in camelCase, with the change types as a list", async () => {
    Database.getInstance.mockResolvedValue(
      createClient([
        {
          id: "row-1",
          domitspropertyid: "property-1",
          kind: "CHANGE",
          changetypes: "availability,rates",
          datefrom: 20261101,
          dateto: 20261105,
          source: "CALENDAR",
          attemptcount: 1,
        },
      ])
    );

    const rows = await new ChannexAriOutboxRepository().claim("property-1", { now: NOW, runStartedAt: RUN_STARTED_AT });

    expect(rows).toEqual([
      {
        id: "row-1",
        domitsPropertyId: "property-1",
        kind: "CHANGE",
        changeTypes: ["availability", "rates"],
        dateFrom: 20261101,
        dateTo: 20261105,
        source: "CALENDAR",
        attemptCount: 1,
      },
    ]);
  });

  test("claims one property's PENDING rows and counts the attempt", async () => {
    const client = createClient();
    Database.getInstance.mockResolvedValue(client);

    await new ChannexAriOutboxRepository().claim("property-1", { now: NOW, runStartedAt: RUN_STARTED_AT });

    const [sql, params] = client.query.mock.calls[0];
    expect(sql).toContain("UPDATE main.channex_ari_outbox");
    expect(sql).toContain("attemptcount = attemptcount + 1");
    expect(sql).toContain("RETURNING");
    expect(params).toEqual(["PROCESSING", NOW, "property-1", "PENDING", RUN_STARTED_AT]);
  });

  test("leaves rows that arrived during the run for the next run", async () => {
    const client = createClient();
    Database.getInstance.mockResolvedValue(client);

    await new ChannexAriOutboxRepository().claim("property-1", { now: NOW, runStartedAt: RUN_STARTED_AT });

    const [sql] = client.query.mock.calls[0];
    expect(sql).toContain("createdat <= $5");
  });

  test("leaves rows that are still waiting for their retry time", async () => {
    const client = createClient();
    Database.getInstance.mockResolvedValue(client);

    await new ChannexAriOutboxRepository().claim("property-1", { now: NOW, runStartedAt: RUN_STARTED_AT });

    const [sql] = client.query.mock.calls[0];
    expect(sql).toContain("(nextattemptat IS NULL OR nextattemptat <= $2)");
  });

  test("returns an empty list when another run claimed the rows first", async () => {
    Database.getInstance.mockResolvedValue(createClient([]));

    await expect(
      new ChannexAriOutboxRepository().claim("property-1", { now: NOW, runStartedAt: RUN_STARTED_AT })
    ).resolves.toEqual([]);
  });
});

describe("ChannexAriOutboxRepository.recoverStaleProcessing", () => {
  test("puts PROCESSING rows that have not moved for the stale window back to PENDING", async () => {
    const client = createClient([{ id: "row-9" }, { id: "row-10" }]);
    Database.getInstance.mockResolvedValue(client);

    const recovered = await new ChannexAriOutboxRepository().recoverStaleProcessing({ now: NOW, staleMs: 300_000 });

    const [sql, params] = client.query.mock.calls[0];
    expect(sql).toContain("UPDATE main.channex_ari_outbox");
    expect(params).toEqual(["PENDING", NOW, "PROCESSING", NOW - 300_000]);
    expect(recovered).toBe(2);
  });

  test("uses the five minute default, which is longer than a worker run can last", async () => {
    const client = createClient();
    Database.getInstance.mockResolvedValue(client);

    await new ChannexAriOutboxRepository().recoverStaleProcessing({ now: NOW });

    const [, params] = client.query.mock.calls[0];
    expect(params[3]).toBe(NOW - 300_000);
  });

  test("reports zero when there is nothing stale", async () => {
    Database.getInstance.mockResolvedValue(createClient([]));

    await expect(new ChannexAriOutboxRepository().recoverStaleProcessing({ now: NOW })).resolves.toBe(0);
  });
});
