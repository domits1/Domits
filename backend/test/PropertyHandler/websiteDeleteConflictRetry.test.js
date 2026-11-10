import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import Database from "database";
import { DirectBookingWebsiteSiteRepository } from "../../functions/PropertyHandler/data/repository/directBookingWebsiteSiteRepository.js";
import { DirectBookingWebsiteDraftRepository } from "../../functions/PropertyHandler/data/repository/directBookingWebsiteDraftRepository.js";
import { SITE_ROW, buildTransactionClient } from "./support/staticPageOutboxTransactionClient.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const conflict = () => Object.assign(new Error("change conflicts with another transaction (OC000)"), { code: "40001" });

const buildSiteClient = ({ commitFailures = [] } = {}) => {
  const client = buildTransactionClient({
    operation: "delete",
    respond: (statement) =>
      /static_page_outbox/.test(statement) ? { records: [], affected: 1 } : { records: [SITE_ROW], affected: 1 },
  });
  const runOnce = client.transaction.getMockImplementation();
  client.transaction.mockImplementation(async (work) => {
    const result = await runOnce(work);
    if (commitFailures.length > 0) {
      throw commitFailures.shift();
    }
    return result;
  });
  return client;
};

describe("deleting a website site when the commit hits an Aurora DSQL conflict", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("runs the whole delete again and returns the deleted site", async () => {
    const client = buildSiteClient({ commitFailures: [conflict()] });

    const site = await new DirectBookingWebsiteSiteRepository().deleteSiteByPropertyIdAndHostId("property-1", "host-1");

    expect(site).toMatchObject({ id: "site-1" });
    expect(client.transaction).toHaveBeenCalledTimes(2);
    expect(client.statements.map(({ parameters }) => parameters)).toEqual([
      ["property-1", "host-1"],
      ["site-1"],
      ["site-1"],
      ["property-1", "host-1"],
      ["site-1"],
      ["site-1"],
    ]);
  });

  it("also retries a conflict that only carries its code on the driver error", async () => {
    const driverConflict = Object.assign(new Error("could not serialize access"), { driverError: { code: "40001" } });
    const client = buildSiteClient({ commitFailures: [driverConflict] });

    await expect(
      new DirectBookingWebsiteSiteRepository().deleteSiteByPropertyIdAndHostId("property-1", "host-1")
    ).resolves.toMatchObject({ id: "site-1" });
    expect(client.transaction).toHaveBeenCalledTimes(2);
  });

  it("gives up after three conflicting attempts with a 409 that asks the host to delete again", async () => {
    const client = buildSiteClient({ commitFailures: [conflict(), conflict(), conflict()] });

    await expect(
      new DirectBookingWebsiteSiteRepository().deleteSiteByPropertyIdAndHostId("property-1", "host-1")
    ).rejects.toMatchObject({
      statusCode: 409,
      code: "delete_conflict",
      message: expect.stringMatching(/delete it again/),
    });
    expect(client.transaction).toHaveBeenCalledTimes(3);
  });

  it("does not run the delete again for an error that is not a conflict", async () => {
    const failure = Object.assign(new Error("duplicate key"), { code: "23505" });
    const client = buildSiteClient({ commitFailures: [failure] });

    await expect(
      new DirectBookingWebsiteSiteRepository().deleteSiteByPropertyIdAndHostId("property-1", "host-1")
    ).rejects.toBe(failure);
    expect(client.transaction).toHaveBeenCalledTimes(1);
  });
});

const buildStatementClient = (failures) => {
  const client = {
    options: { schema: "main" },
    query: jest.fn(async () => {
      if (failures.length > 0) {
        throw failures.shift();
      }
      return [];
    }),
  };
  Database.getInstance.mockResolvedValue(client);
  return client;
};

const deleteDraft = () =>
  new DirectBookingWebsiteDraftRepository().deleteDraftByPropertyIdAndHostId("property-1", "host-1");

describe("deleting the draft of a property when the statement hits an Aurora DSQL conflict", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("runs the same delete again", async () => {
    const client = buildStatementClient([conflict()]);

    await expect(deleteDraft()).resolves.toBeUndefined();
    expect(client.query.mock.calls.map(([, values]) => values)).toEqual([
      ["property-1", "host-1"],
      ["property-1", "host-1"],
    ]);
  });

  it("gives up after three conflicting attempts with the same 409", async () => {
    const client = buildStatementClient([conflict(), conflict(), conflict()]);

    await expect(deleteDraft()).rejects.toMatchObject({ statusCode: 409, code: "delete_conflict" });
    expect(client.query).toHaveBeenCalledTimes(3);
  });

  it("does not run the delete again for an error that is not a conflict", async () => {
    const failure = Object.assign(new Error("connection terminated"), { code: "57P01" });
    const client = buildStatementClient([failure]);

    await expect(deleteDraft()).rejects.toBe(failure);
    expect(client.query).toHaveBeenCalledTimes(1);
  });
});
