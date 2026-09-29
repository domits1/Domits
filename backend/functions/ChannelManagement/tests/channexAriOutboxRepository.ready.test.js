jest.mock("../../.shared/integrations/ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

import ChannexAriOutboxRepository, {
  claimableRowSql,
} from "../../.shared/channelManagement/repositories/channexAriOutboxRepository.js";
import { NOW, mockClient } from "./support/outboxTestSupport.js";

describe("ChannexAriOutboxRepository.findReadyProperties", () => {
  test("returns the properties oldest first, with their oldest waiting row", async () => {
    mockClient([
      { domitspropertyid: "property-1", oldestcreatedat: "1749999000000" },
      { domitspropertyid: "property-2", oldestcreatedat: "1749999500000" },
    ]);

    const ready = await new ChannexAriOutboxRepository().findReadyProperties({ now: NOW });

    expect(ready).toEqual([
      { domitsPropertyId: "property-1", oldestCreatedAt: 1_749_999_000_000 },
      { domitsPropertyId: "property-2", oldestCreatedAt: 1_749_999_500_000 },
    ]);
  });

  test("asks for PENDING rows per property: quiet for 60 s, or capped at 5 min, or urgent", async () => {
    const client = mockClient();

    await new ChannexAriOutboxRepository().findReadyProperties({ now: NOW, limit: 25 });

    const [sql, params] = client.query.mock.calls[0];
    expect(sql).toContain("main.channex_ari_outbox");
    expect(sql).toContain("GROUP BY pending.domitspropertyid");
    expect(sql).toContain("pending.source = ANY($3)");
    expect(sql).toContain("MAX(pending.createdat) <= $4");
    expect(sql).toContain("MIN(pending.createdat) <= $5");
    expect(sql).toContain("ORDER BY oldestcreatedat ASC");
    expect(params).toEqual(["PENDING", NOW, ["BOOKING", "CHANNEX_IMPORT"], NOW - 60_000, NOW - 300_000, 25]);
  });

  test("a property is only ready when the claim could take one of its rows: both use the same rule", async () => {
    const client = mockClient();

    await new ChannexAriOutboxRepository().findReadyProperties({ now: NOW });

    const [sql] = client.query.mock.calls[0];
    expect(sql).toContain(`EXISTS (SELECT 1 FROM main.channex_ari_outbox AS target
        WHERE target.domitspropertyid = pending.domitspropertyid
          AND ${claimableRowSql("main.channex_ari_outbox", { pending: "$1", now: "$2" })})`);
  });

  test("returns an empty list when no property is ready", async () => {
    mockClient([]);

    await expect(new ChannexAriOutboxRepository().findReadyProperties({ now: NOW })).resolves.toEqual([]);
  });
});
