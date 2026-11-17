import { describe, expect, it, jest } from "@jest/globals";
import Database from "database";
import { DirectBookingWebsiteEventRepository } from "../../functions/PropertyHandler/data/repository/directBookingWebsiteEventRepository.js";

jest.mock("database", () => ({ __esModule: true, default: { getInstance: jest.fn() } }));

const SCHEMA = process.env.TEST === "true" ? "test" : "main";
const COUNT = Object.freeze({ hostId: "host-1", eventType: "SITE_CONTACT_MESSAGE_SENT", since: 1782200000000 });
const countWith = (rows) => {
  const client = { query: jest.fn(async () => rows) };
  Database.getInstance.mockResolvedValue(client);
  return { client, counted: new DirectBookingWebsiteEventRepository().countEventsSince(COUNT) };
};

describe("counting the recent website events of one host and type", () => {
  it("counts on the host, type and time index and reads the count as a number", async () => {
    const { client, counted } = countWith([{ total: "7" }]);

    await expect(counted).resolves.toBe(7);
    const [statement, parameters] = client.query.mock.calls[0];
    expect(statement.replaceAll(/\s+/g, " ").trim()).toBe(
      `SELECT COUNT(*)::bigint AS total FROM ${SCHEMA}.standalone_site_event WHERE host_id = $1 AND event_type = $2 AND occurred_at >= $3`
    );
    expect(parameters).toEqual(["host-1", "SITE_CONTACT_MESSAGE_SENT", 1782200000000]);
  });

  it.each([[[]], [[{}]], [[{ total: "many" }]], [undefined]])(
    "throws on the answer %p instead of reading zero",
    async (rows) => {
      await expect(countWith(rows).counted).rejects.toThrow("The website event count could not be read.");
    }
  );
});
