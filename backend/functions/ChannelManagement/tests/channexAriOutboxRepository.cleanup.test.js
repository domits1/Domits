jest.mock("../../.shared/integrations/ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

import ChannexAriOutboxRepository from "../../.shared/channelManagement/repositories/channexAriOutboxRepository.js";
import { NOW, mockClient } from "./support/outboxTestSupport.js";

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;

describe("ChannexAriOutboxRepository.cleanup", () => {
  test("deletes sent and skipped rows after 30 days, failed after 90, one capped batch", async () => {
    const client = mockClient([{ id: "row-1" }, { id: "row-2" }]);

    const deleted = await new ChannexAriOutboxRepository().cleanup({ now: NOW });

    const [sql, params] = client.query.mock.calls[0];
    expect(sql).toContain("DELETE FROM main.channex_ari_outbox");
    expect(sql).toContain("LIMIT");
    expect(params).toEqual([["PROCESSED", "SKIPPED"], NOW - THIRTY_DAYS, "FAILED", NOW - NINETY_DAYS, 1000]);
    expect(params[4]).toBeLessThan(3000);
    expect(deleted).toBe(2);
  });

  test("never deletes rows that still have work to do", async () => {
    const client = mockClient();

    await new ChannexAriOutboxRepository().cleanup({ now: NOW });

    const [, params] = client.query.mock.calls[0];
    expect(params[0]).not.toContain("PENDING");
    expect(params[0]).not.toContain("PROCESSING");
  });

  test("reports zero when there is nothing old enough to delete", async () => {
    mockClient([]);

    await expect(new ChannexAriOutboxRepository().cleanup({ now: NOW })).resolves.toBe(0);
  });
});
