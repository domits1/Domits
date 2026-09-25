jest.mock("../../.shared/integrations/ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

import Database from "../../.shared/integrations/ORM/index.js";
import ChannexAriOutboxRepository from "../../.shared/channelManagement/repositories/channexAriOutboxRepository.js";

const NOW = 1_750_000_000_000;
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;

const createClient = (rows = []) => ({
  options: { schema: "main" },
  query: jest.fn(async () => rows),
});

describe("ChannexAriOutboxRepository.cleanup", () => {
  test("deletes sent and skipped rows after 30 days and failed rows after 90", async () => {
    const client = createClient([{ id: "row-1" }, { id: "row-2" }]);
    Database.getInstance.mockResolvedValue(client);

    const deleted = await new ChannexAriOutboxRepository().cleanup({ now: NOW });

    const [sql, params] = client.query.mock.calls[0];
    expect(sql).toContain("DELETE FROM main.channex_ari_outbox");
    expect(params[0]).toEqual(["PROCESSED", "SKIPPED"]);
    expect(params[1]).toBe(NOW - THIRTY_DAYS);
    expect(params[2]).toBe("FAILED");
    expect(params[3]).toBe(NOW - NINETY_DAYS);
    expect(deleted).toBe(2);
  });

  test("deletes at most one batch, staying under the DSQL limit of 3000 rows per transaction", async () => {
    const client = createClient();
    Database.getInstance.mockResolvedValue(client);

    await new ChannexAriOutboxRepository().cleanup({ now: NOW });

    const [sql, params] = client.query.mock.calls[0];
    expect(sql).toContain("LIMIT");
    expect(params[4]).toBe(1000);
    expect(params[4]).toBeLessThan(3000);
  });

  test("never deletes rows that still have work to do", async () => {
    const client = createClient();
    Database.getInstance.mockResolvedValue(client);

    await new ChannexAriOutboxRepository().cleanup({ now: NOW });

    const [, params] = client.query.mock.calls[0];
    expect(params[0]).not.toContain("PENDING");
    expect(params[0]).not.toContain("PROCESSING");
  });

  test("honours a smaller batch when the caller asks for one", async () => {
    const client = createClient();
    Database.getInstance.mockResolvedValue(client);

    await new ChannexAriOutboxRepository().cleanup({ now: NOW, batch: 100 });

    const [, params] = client.query.mock.calls[0];
    expect(params[4]).toBe(100);
  });

  test("reports zero when there is nothing old enough to delete", async () => {
    Database.getInstance.mockResolvedValue(createClient([]));

    await expect(new ChannexAriOutboxRepository().cleanup({ now: NOW })).resolves.toBe(0);
  });
});
