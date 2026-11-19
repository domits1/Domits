jest.mock("../../.shared/integrations/ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

import ChannexAriOutboxRepository from "../../.shared/channelManagement/repositories/channexAriOutboxRepository.js";
import { NOW, mockClient } from "./support/outboxTestSupport.js";

const DAY = 24 * 60 * 60 * 1000;

// Answers the counts query and the recent-failures query separately, by their SQL.
const mockHealthQueries = ({ counts, failures }) => {
  const client = mockClient();
  client.query.mockImplementation(async (sql) => (/LIMIT/i.test(sql) ? failures : counts));
  return client;
};

const queryContaining = (client, text) => client.query.mock.calls.find(([sql]) => sql.includes(text));

describe("ChannexAriOutboxRepository.healthSummary", () => {
  // Postgres returns count() and a bigint min() as strings.
  test("counts waiting, failed and sent rows and turns the database strings into numbers", async () => {
    mockHealthQueries({
      counts: [
        {
          pending: "2",
          processing: "1",
          oldestpendingcreatedat: String(NOW - 40_000),
          failedlast24hours: "1",
          failedlast7days: "3",
          processedlast7days: "31",
        },
      ],
      failures: [],
    });

    const summary = await new ChannexAriOutboxRepository().healthSummary({ now: NOW });

    expect(summary).toEqual({
      pending: 2,
      processing: 1,
      oldestPendingCreatedAt: NOW - 40_000,
      failedLast24Hours: 1,
      failedLast7Days: 3,
      processedLast7Days: 31,
      recentFailures: [],
    });
  });

  test("reads the counts from the outbox table with the 24-hour and 7-day windows", async () => {
    const client = mockHealthQueries({ counts: [{}], failures: [] });

    await new ChannexAriOutboxRepository().healthSummary({ now: NOW });

    const [sql, params] = queryContaining(client, "count(");
    expect(sql).toMatch(/^\s*SELECT/i);
    expect(sql).toContain("FROM main.channex_ari_outbox");
    expect(params).toEqual(["PENDING", "PROCESSING", "FAILED", NOW - DAY, NOW - 7 * DAY, "PROCESSED"]);
  });

  test("lists the ten newest failures with their reason", async () => {
    const client = mockHealthQueries({
      counts: [{}],
      failures: [
        {
          id: "row-1",
          domitspropertyid: "property-1",
          datefrom: 20261110,
          dateto: "20261112",
          failurereason: "CHANNEX_REJECTED",
          updatedat: String(NOW - 1000),
        },
      ],
    });

    const summary = await new ChannexAriOutboxRepository().healthSummary({ now: NOW });

    const [sql, params] = queryContaining(client, "LIMIT");
    expect(sql).toMatch(/^\s*SELECT/i);
    expect(sql).toMatch(/ORDER BY updatedat DESC/i);
    expect(params).toEqual(["FAILED", 10]);
    expect(summary.recentFailures).toEqual([
      {
        id: "row-1",
        domitsPropertyId: "property-1",
        dateFrom: 20261110,
        dateTo: 20261112,
        failureReason: "CHANNEX_REJECTED",
        updatedAt: NOW - 1000,
      },
    ]);
  });

  // The health rule reads a missing oldest time as "nothing waiting"; null keeps that explicit.
  test("an empty outbox gives zeros and no oldest waiting time", async () => {
    mockHealthQueries({
      counts: [
        {
          pending: "0",
          processing: "0",
          oldestpendingcreatedat: null,
          failedlast24hours: "0",
          failedlast7days: "0",
          processedlast7days: "0",
        },
      ],
      failures: [],
    });

    const summary = await new ChannexAriOutboxRepository().healthSummary({ now: NOW });

    expect(summary).toEqual({
      pending: 0,
      processing: 0,
      oldestPendingCreatedAt: null,
      failedLast24Hours: 0,
      failedLast7Days: 0,
      processedLast7Days: 0,
      recentFailures: [],
    });
  });
});
