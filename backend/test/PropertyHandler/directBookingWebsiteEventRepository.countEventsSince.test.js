import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import Database from "database";
import { DirectBookingWebsiteEventRepository } from "../../functions/PropertyHandler/data/repository/directBookingWebsiteEventRepository.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const SCHEMA = process.env.TEST === "true" ? "test" : "main";
const COUNT = Object.freeze({ hostId: "host-1", eventType: "SITE_CONTACT_MESSAGE_SENT", since: 1782200000000 });

const useRows = (rows) => {
  const client = { query: jest.fn(async () => rows) };
  Database.getInstance.mockResolvedValue(client);
  return client;
};

beforeEach(() => {
  Database.getInstance.mockReset();
});

describe("counting the recent website events of one host and type", () => {
  it("counts on the host, type and time index and reads the count as a number", async () => {
    const client = useRows([{ total: "7" }]);

    await expect(new DirectBookingWebsiteEventRepository().countEventsSince(COUNT)).resolves.toBe(7);

    const [statement, parameters] = client.query.mock.calls[0];
    expect(statement.replaceAll(/\s+/g, " ").trim()).toBe(
      `SELECT COUNT(*)::bigint AS total FROM ${SCHEMA}.standalone_site_event WHERE host_id = $1 AND event_type = $2 AND occurred_at >= $3`
    );
    expect(parameters).toEqual(["host-1", "SITE_CONTACT_MESSAGE_SENT", 1782200000000]);
  });

  it.each([
    ["no row", []],
    ["no count", [{}]],
    ["a count that is not a number", [{ total: "many" }]],
    ["no answer", undefined],
  ])("throws on %s instead of reading it as zero", async (_label, rows) => {
    useRows(rows);

    await expect(new DirectBookingWebsiteEventRepository().countEventsSince(COUNT)).rejects.toThrow(
      "The website event count could not be read."
    );
  });
});
