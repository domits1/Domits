jest.mock("../../.shared/integrations/ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

import ChannexAriOutboxRepository from "../../.shared/channelManagement/repositories/channexAriOutboxRepository.js";
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
    expect(sql).toContain("GROUP BY domitspropertyid");
    expect(sql).toContain("source = ANY($3)");
    expect(sql).toContain("MAX(createdat) <= $4");
    expect(sql).toContain("MIN(createdat) <= $5");
    expect(sql).toContain("ORDER BY oldestcreatedat ASC");
    expect(params).toEqual(["PENDING", NOW, ["BOOKING", "CHANNEX_IMPORT"], NOW - 60_000, NOW - 300_000, 25]);
  });

  test("skips a property entirely while any of its rows waits for nextAttemptAt", async () => {
    const client = mockClient();

    await new ChannexAriOutboxRepository().findReadyProperties({ now: NOW });

    const [sql] = client.query.mock.calls[0];
    expect(sql).toContain("SUM(CASE WHEN nextattemptat IS NOT NULL AND nextattemptat > $2 THEN 1 ELSE 0 END) = 0");
  });

  test("returns an empty list when no property is ready", async () => {
    mockClient([]);

    await expect(new ChannexAriOutboxRepository().findReadyProperties({ now: NOW })).resolves.toEqual([]);
  });
});
