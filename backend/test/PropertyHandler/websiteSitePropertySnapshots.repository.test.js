import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { readFileSync } from "node:fs";
import path from "node:path";
import Database from "database";
import { DirectBookingWebsiteSiteRepository } from "../../functions/PropertyHandler/data/repository/directBookingWebsiteSiteRepository.js";
import { WebsiteSitePropertyNotAllowedError } from "../../functions/PropertyHandler/util/exception/WebsiteSitePropertyNotAllowedError.js";
import { SITE_ROW, buildTransactionClient } from "./support/staticPageOutboxTransactionClient.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const SCHEMA = process.env.TEST === "true" ? "test" : "main";
const SNAPSHOTS = [
  { propertyId: "property-2", propertySnapshot: { property: { id: "property-2", title: "Beach house" } } },
  { propertyId: "property-3", propertySnapshot: { property: { id: "property-3", title: "Barn" } } },
];
const PUBLISH_INPUT = {
  propertyId: "property-1",
  hostId: "host-1",
  siteName: "Cliff House",
  status: "PUBLISHED",
  templateKey: "panorama-landing",
  publishedPropertySnapshot: { property: { id: "property-1" } },
  publishedContentOverrides: {},
  publishedThemeOverrides: {},
  publishedAt: 1757000000000,
};

const isSitePropertyCheck = (statement) => /FOR UPDATE/.test(statement);
const isSnapshotWrite = (statement) => /SET published_site_properties_json/.test(statement);

const buildClient = ({ activeSiteProperties = ["property-2", "property-3"] } = {}) =>
  buildTransactionClient({
    operation: "publish",
    respond: (statement, parameters) => {
      if (isSitePropertyCheck(statement)) {
        return { records: activeSiteProperties.includes(parameters[0]) ? [{ id: parameters[0] }] : [], affected: 0 };
      }
      if (/UPDATE \S*\.property\s/.test(statement)) return { records: [{ id: "property-1" }], affected: 1 };
      if (/static_page_outbox/.test(statement)) return { records: [{ site_id: "site-1", revision: 4 }], affected: 1 };
      return { records: [SITE_ROW], affected: 1 };
    },
  });

const kinds = (client) =>
  client.statements.map(({ statement }) => {
    if (isSitePropertyCheck(statement)) return "check";
    if (isSnapshotWrite(statement)) return "snapshots";
    if (/UPDATE \S*\.property\s/.test(statement)) return "main";
    if (/static_page_outbox/.test(statement)) return "outbox";
    return "site";
  });

beforeEach(() => {
  jest.clearAllMocks();
});

describe("publishing the snapshots of a website's properties", () => {
  it("checks every property in the transaction, then writes the snapshots next to the site", async () => {
    const client = buildClient();

    await new DirectBookingWebsiteSiteRepository().upsertSiteWithStaticPageOutbox({
      ...PUBLISH_INPUT,
      sitePropertySnapshots: SNAPSHOTS,
    });

    expect(kinds(client)).toEqual(["main", "check", "check", "site", "snapshots", "outbox"]);
    const checks = client.statements.filter(({ statement }) => isSitePropertyCheck(statement));
    expect(checks.map(({ parameters }) => parameters)).toEqual([
      ["property-2", "host-1"],
      ["property-3", "host-1"],
    ]);
    expect(checks[0].statement).toMatch(
      new RegExp(`FROM ${SCHEMA}\\.property\\s+WHERE id = \\$1 AND hostid = \\$2 AND status = 'ACTIVE'\\s+FOR UPDATE`)
    );
    const write = client.statements.find(({ statement }) => isSnapshotWrite(statement));
    expect(write.statement).toMatch(new RegExp(`UPDATE ${SCHEMA}\\.standalone_site\\s+SET published_site_properties_json = \\$2\\s+WHERE id = \\$1`));
    expect(write.parameters).toEqual(["site-1", JSON.stringify(SNAPSHOTS)]);
    expect(client.committed).toBe(true);
  });

  it("publishes nothing when a property is no longer active or no longer the host's", async () => {
    const client = buildClient({ activeSiteProperties: ["property-2"] });

    await expect(
      new DirectBookingWebsiteSiteRepository().upsertSiteWithStaticPageOutbox({ ...PUBLISH_INPUT, sitePropertySnapshots: SNAPSHOTS })
    ).rejects.toBeInstanceOf(WebsiteSitePropertyNotAllowedError);

    expect(kinds(client)).toEqual(["main", "check", "check"]);
    expect(client.rolledBack).toBe(true);
  });

  it("writes an empty set without checks, so a host who removes every other property clears the old snapshots", async () => {
    const client = buildClient();

    await new DirectBookingWebsiteSiteRepository().upsertSiteWithStaticPageOutbox({ ...PUBLISH_INPUT, sitePropertySnapshots: [] });

    expect(kinds(client)).toEqual(["main", "site", "snapshots", "outbox"]);
    expect(client.statements.find(({ statement }) => isSnapshotWrite(statement)).parameters).toEqual(["site-1", "[]"]);
  });

  it("runs the same statements as before for a publish without a list, so it needs no new column", async () => {
    const client = buildClient();

    await new DirectBookingWebsiteSiteRepository().upsertSiteWithStaticPageOutbox(PUBLISH_INPUT);

    expect(kinds(client)).toEqual(["main", "site", "outbox"]);
    expect(client.statements.some(({ statement }) => /published_site_properties_json/.test(statement))).toBe(false);
  });

  it("rolls the whole publish back when the snapshots cannot be written", async () => {
    const client = buildClient();
    const respond = client.transactionRunner.query.getMockImplementation();
    client.transactionRunner.query.mockImplementation(async (statement, parameters, structured) => {
      if (isSnapshotWrite(statement)) throw new Error('column "published_site_properties_json" does not exist');
      return respond(statement, parameters, structured);
    });

    await expect(
      new DirectBookingWebsiteSiteRepository().upsertSiteWithStaticPageOutbox({ ...PUBLISH_INPUT, sitePropertySnapshots: SNAPSHOTS })
    ).rejects.toThrow("does not exist");
    expect(client.rolledBack).toBe(true);
    expect(client.committed).toBe(false);
  });

  it("checks and writes again on retry when a concurrent publish or property change wins the commit", async () => {
    const client = buildClient();
    const runTransaction = client.transaction.getMockImplementation();
    client.transaction.mockImplementationOnce(async (runInTransaction) => {
      await runInTransaction({ queryRunner: client.transactionRunner });
      throw Object.assign(new Error("OC000: change conflicts with another transaction"), { code: "40001" });
    });
    client.transaction.mockImplementation(runTransaction);

    await new DirectBookingWebsiteSiteRepository().upsertSiteWithStaticPageOutbox({ ...PUBLISH_INPUT, sitePropertySnapshots: SNAPSHOTS });

    expect(client.transaction).toHaveBeenCalledTimes(2);
    expect(kinds(client)).toEqual([
      ...["main", "check", "check", "site", "snapshots", "outbox"],
      ...["main", "check", "check", "site", "snapshots", "outbox"],
    ]);
    expect(client.committed).toBe(true);
  });
});

describe("reading the published properties of a website", () => {
  const readClient = (rows) => {
    const client = { options: { schema: "main" }, query: jest.fn(async () => rows) };
    Database.getInstance.mockResolvedValue(client);
    return client;
  };

  it("reads the snapshots of one site", async () => {
    const client = readClient([{ published_site_properties_json: JSON.stringify(SNAPSHOTS) }]);

    expect(await new DirectBookingWebsiteSiteRepository().getPublishedSitePropertySnapshots("site-1")).toEqual(SNAPSHOTS);
    expect(client.query).toHaveBeenCalledWith(
      `SELECT published_site_properties_json FROM ${SCHEMA}.standalone_site WHERE id = $1`,
      ["site-1"]
    );
  });

  it.each([
    ["a site that never published a list", [{ published_site_properties_json: null }]],
    ["a missing site", []],
    ["a value that is not a list", [{ published_site_properties_json: '{"propertyId":"property-2"}' }]],
    ["a value that is not JSON", [{ published_site_properties_json: "not json" }]],
  ])("reads no snapshots for %s", async (_label, rows) => {
    readClient(rows);

    expect(await new DirectBookingWebsiteSiteRepository().getPublishedSitePropertySnapshots("site-1")).toEqual([]);
  });

  it("reads the live host and status of the listed properties in one query", async () => {
    const client = readClient([{ id: "property-2", hostid: "host-1", status: "ACTIVE" }]);

    const states = await new DirectBookingWebsiteSiteRepository().getSitePropertyStates(["property-2", "property-3"]);

    expect(states).toEqual([{ id: "property-2", hostId: "host-1", status: "ACTIVE" }]);
    expect(client.query).toHaveBeenCalledWith(`SELECT id, hostid, status FROM ${SCHEMA}.property WHERE id = ANY($1)`, [
      ["property-2", "property-3"],
    ]);
  });

  it("does not query for an empty list", async () => {
    const client = readClient([]);

    expect(await new DirectBookingWebsiteSiteRepository().getSitePropertyStates([])).toEqual([]);
    expect(client.query).not.toHaveBeenCalled();
  });
});

describe("the migration for the snapshots", () => {
  const migration = (name) => readFileSync(path.join(process.cwd(), "ORM", "migrations", name), "utf8");

  it("adds the nullable column the repository writes, and the rollback drops it", () => {
    expect(migration("20261117_standalone_site_property_snapshots.sql")).toMatch(
      /ALTER TABLE IF EXISTS main\.standalone_site\nADD COLUMN IF NOT EXISTS published_site_properties_json TEXT NULL;/
    );
    expect(migration("20261117_standalone_site_property_snapshots_rollback.sql")).toMatch(
      /DROP COLUMN IF EXISTS published_site_properties_json;/
    );
  });
});
