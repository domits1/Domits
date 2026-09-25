jest.mock("../../.shared/integrations/ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

import ChannexAriOutboxRepository from "../../.shared/channelManagement/repositories/channexAriOutboxRepository.js";
import { NOW, mockClient } from "./support/outboxTestSupport.js";

const RUN_STARTED_AT = NOW - 1_000;
const claimed = (overrides = {}) => ({
  id: "row-1",
  domitspropertyid: "property-1",
  kind: "CHANGE",
  changetypes: "availability,rates",
  datefrom: 20261101,
  dateto: 20261105,
  source: "CALENDAR",
  attemptcount: 1,
  ...overrides,
});

describe("ChannexAriOutboxRepository.claim", () => {
  test("returns the claimed rows in camelCase, with the change types as a list", async () => {
    mockClient([claimed()]);

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

  test("claims only this property's PENDING rows that predate the run and are not in back-off", async () => {
    const client = mockClient();

    await new ChannexAriOutboxRepository().claim("property-1", { now: NOW, runStartedAt: RUN_STARTED_AT });

    const [sql, params] = client.query.mock.calls[0];
    expect(sql).toContain("UPDATE main.channex_ari_outbox");
    expect(sql).toContain("attemptcount = attemptcount + 1");
    expect(sql).toContain("createdat <= $5");
    expect(sql).toContain("(nextattemptat IS NULL OR nextattemptat <= $2)");
    expect(sql).toContain("RETURNING");
    expect(params).toEqual(["PROCESSING", NOW, "property-1", "PENDING", RUN_STARTED_AT]);
  });

  test("returns an empty list when another run claimed the rows first", async () => {
    mockClient([]);

    await expect(
      new ChannexAriOutboxRepository().claim("property-1", { now: NOW, runStartedAt: RUN_STARTED_AT })
    ).resolves.toEqual([]);
  });
});

describe("ChannexAriOutboxRepository.recoverStaleProcessing", () => {
  test("puts PROCESSING rows untouched for the stale window back to PENDING", async () => {
    const client = mockClient([{ id: "row-9" }, { id: "row-10" }]);

    const recovered = await new ChannexAriOutboxRepository().recoverStaleProcessing({ now: NOW });

    const [sql, params] = client.query.mock.calls[0];
    expect(sql).toContain("UPDATE main.channex_ari_outbox");
    expect(params).toEqual(["PENDING", NOW, "PROCESSING", NOW - 300_000]);
    expect(recovered).toBe(2);
  });

  test("reports zero when there is nothing stale", async () => {
    mockClient([]);

    await expect(new ChannexAriOutboxRepository().recoverStaleProcessing({ now: NOW })).resolves.toBe(0);
  });
});
