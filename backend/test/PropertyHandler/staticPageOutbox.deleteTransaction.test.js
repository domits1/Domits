import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { DirectBookingWebsiteSiteRepository } from "../../functions/PropertyHandler/data/repository/directBookingWebsiteSiteRepository.js";
import { SITE_ROW, buildTransactionClient } from "./support/staticPageOutboxTransactionClient.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const SCHEMA = process.env.TEST === "true" ? "test" : "main";

const buildClient = ({ siteRecords = [SITE_ROW], outboxFailure = null } = {}) =>
  buildTransactionClient({
    operation: "delete",
    respond: (statement) => {
      if (/static_page_outbox/.test(statement)) {
        if (outboxFailure) {
          throw outboxFailure;
        }
        return { records: [], affected: 1 };
      }
      return { records: siteRecords, affected: siteRecords.length };
    },
  });

describe("deleting a website site removes its static page outbox row in the same transaction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deletes the site row and the outbox row of a site with a queued page, then commits", async () => {
    const client = buildClient();

    const site = await new DirectBookingWebsiteSiteRepository().deleteSiteByPropertyIdAndHostId("property-1", "host-1");

    expect(site).toMatchObject({ id: "site-1", staticPageRevision: 4 });
    expect(client.statements.map(({ statement }) => statement.trim().split(/\s+/).slice(0, 3).join(" "))).toEqual([
      `DELETE FROM ${SCHEMA}.standalone_site`,
      `DELETE FROM ${SCHEMA}.static_page_outbox`,
    ]);
    expect(client.statements[0].parameters).toEqual(["property-1", "host-1"]);
    expect(client.statements[1].statement).toContain("WHERE site_id = $1");
    expect(client.statements[1].parameters).toEqual(["site-1"]);
    expect(client.committed).toBe(true);
    expect(client.rolledBack).toBe(false);
    expect(client.transactionRunner.release).not.toHaveBeenCalled();
  });

  it("rejects and leaves the transaction to roll back when the outbox delete fails, so the site row is never deleted on its own", async () => {
    const failure = new Error("change conflicts with another transaction (OC000)");
    const client = buildClient({ outboxFailure: failure });

    await expect(
      new DirectBookingWebsiteSiteRepository().deleteSiteByPropertyIdAndHostId("property-1", "host-1")
    ).rejects.toBe(failure);

    expect(client.statements).toHaveLength(2);
    expect(client.committed).toBe(false);
    expect(client.rolledBack).toBe(true);
    expect(client.transactionRunner.release).not.toHaveBeenCalled();
  });

  it("touches the outbox only when a site was deleted", async () => {
    const client = buildClient({ siteRecords: [] });

    await expect(
      new DirectBookingWebsiteSiteRepository().deleteSiteByPropertyIdAndHostId("property-1", "host-9")
    ).resolves.toBeNull();

    expect(client.statements).toHaveLength(1);
    expect(client.statements[0].statement).toContain(`DELETE FROM ${SCHEMA}.standalone_site`);
    expect(client.committed).toBe(true);
    expect(client.transactionRunner.release).not.toHaveBeenCalled();
  });
});
