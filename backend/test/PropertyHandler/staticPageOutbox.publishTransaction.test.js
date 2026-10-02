import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import Database from "database";
import { DirectBookingWebsiteSiteRepository } from "../../functions/PropertyHandler/data/repository/directBookingWebsiteSiteRepository.js";
import { WebsitePublishConflictError } from "../../functions/PropertyHandler/util/exception/WebsitePublishConflictError.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const SCHEMA = process.env.TEST === "true" ? "test" : "main";

const SITE_ROW = {
  id: "site-1",
  property_id: "property-1",
  host_id: "host-1",
  site_name: "Cliff House",
  primary_locale: "en",
  status: "PUBLISHED",
  template_key: "panorama-landing",
  published_property_snapshot_json: "{}",
  published_content_overrides_json: "{}",
  published_theme_overrides_json: "{}",
  preview_token_hash: null,
  published_at: 1757000000000,
  suspended_at: null,
  static_page_revision: 4,
  created_at: 1756000000000,
  updated_at: 1757000000000,
};

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

const buildClient = ({ siteRecords = [SITE_ROW], outboxRecords = [{ site_id: "site-1", revision: 4 }] } = {}) => {
  const statements = [];
  const transactionRunner = {
    query: jest.fn(async (statement, parameters, useStructuredResult) => {
      statements.push({ statement, parameters, useStructuredResult });
      const records = /static_page_outbox/.test(statement) ? outboxRecords : siteRecords;
      return useStructuredResult ? { records, affected: records.length } : records;
    }),
    release: jest.fn().mockResolvedValue(undefined),
  };
  const client = {
    options: { schema: "main" },
    statements,
    transactionRunner,
    committed: false,
    rolledBack: false,
    transaction: jest.fn(async (runInTransaction) => {
      try {
        const result = await runInTransaction({ queryRunner: transactionRunner });
        client.committed = true;
        return result;
      } catch (error) {
        client.rolledBack = true;
        throw error;
      }
    }),
    createQueryRunner: jest.fn(() => {
      throw new Error("the publish must run inside one transaction, not on a separate query runner");
    }),
    query: jest.fn(async () => {
      throw new Error("the publish must run inside one transaction, not on the data source");
    }),
  };
  Database.getInstance.mockResolvedValue(client);
  return client;
};

const statementFor = (client, pattern) => client.statements.find(({ statement }) => pattern.test(statement));

const serializationConflict = () =>
  Object.assign(new Error("OC000: change conflicts with another transaction"), { code: "40001" });

describe("publishing a site writes its page outbox row in the same transaction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("writes the site and the outbox row through one transaction and returns the site", async () => {
    const client = buildClient();
    const repository = new DirectBookingWebsiteSiteRepository();

    const site = await repository.upsertSiteWithStaticPageOutbox(PUBLISH_INPUT);

    expect(client.transaction).toHaveBeenCalledTimes(1);
    expect(client.statements).toHaveLength(2);
    expect(statementFor(client, new RegExp(`INSERT INTO ${SCHEMA}\\.standalone_site`))).toBeDefined();
    expect(statementFor(client, new RegExp(`INSERT INTO ${SCHEMA}\\.static_page_outbox`))).toBeDefined();
    expect(client.committed).toBe(true);
    expect(site).toMatchObject({ id: "site-1", propertyId: "property-1", hostId: "host-1", status: "PUBLISHED" });
  });

  it("rolls the publish back when the outbox row cannot be written, so no site is published without work queued", async () => {
    const client = buildClient();
    client.transactionRunner.query.mockImplementation(async (statement) => {
      if (/static_page_outbox/.test(statement)) {
        throw new Error("outbox unavailable");
      }
      return { records: [SITE_ROW], affected: 1 };
    });
    const repository = new DirectBookingWebsiteSiteRepository();

    await expect(repository.upsertSiteWithStaticPageOutbox(PUBLISH_INPUT)).rejects.toThrow("outbox unavailable");
    expect(client.rolledBack).toBe(true);
    expect(client.committed).toBe(false);
  });

  it("rolls back and queues nothing when the site itself cannot be written", async () => {
    const client = buildClient();
    client.transactionRunner.query.mockRejectedValueOnce(new Error("site unavailable"));
    const repository = new DirectBookingWebsiteSiteRepository();

    await expect(repository.upsertSiteWithStaticPageOutbox(PUBLISH_INPUT)).rejects.toThrow("site unavailable");
    expect(statementFor(client, /static_page_outbox/)).toBeUndefined();
    expect(client.rolledBack).toBe(true);
    expect(client.transaction).toHaveBeenCalledTimes(1);
  });

  it("publishes again after losing a serialization conflict, so two publishes of one site both land", async () => {
    const client = buildClient();
    client.transaction.mockRejectedValueOnce(serializationConflict());
    const repository = new DirectBookingWebsiteSiteRepository();

    const site = await repository.upsertSiteWithStaticPageOutbox(PUBLISH_INPUT);

    expect(site.id).toBe("site-1");
    expect(client.transaction).toHaveBeenCalledTimes(2);
    expect(client.committed).toBe(true);
  });

  it("stops after three conflicts with an error the host can act on, not a raw database failure", async () => {
    const client = buildClient();
    client.transaction.mockRejectedValue(serializationConflict());
    const repository = new DirectBookingWebsiteSiteRepository();

    const failure = await repository.upsertSiteWithStaticPageOutbox(PUBLISH_INPUT).catch((error) => error);

    expect(failure).toBeInstanceOf(WebsitePublishConflictError);
    expect(failure.statusCode).toBe(409);
    expect(failure.cause.code).toBe("40001");
    expect(client.transaction).toHaveBeenCalledTimes(3);
  });

  it("fails the publish when the site upsert returns no row instead of queueing work for an unknown site", async () => {
    const client = buildClient({ siteRecords: [] });
    const repository = new DirectBookingWebsiteSiteRepository();

    await expect(repository.upsertSiteWithStaticPageOutbox(PUBLISH_INPUT)).rejects.toThrow(
      "Publishing a website site did not return the stored site."
    );
    expect(statementFor(client, /static_page_outbox/)).toBeUndefined();
    expect(client.rolledBack).toBe(true);
  });

  it("takes the site id and the revision from the stored row, never from the caller", async () => {
    const client = buildClient();
    const repository = new DirectBookingWebsiteSiteRepository();

    await repository.upsertSiteWithStaticPageOutbox({
      ...PUBLISH_INPUT,
      siteId: "site-from-the-request",
      revision: 999,
      staticPageRevision: 999,
    });

    const outbox = statementFor(client, /static_page_outbox/);
    expect(outbox.parameters).toEqual(["site-1", "property-1", "host-1", 4, expect.any(Number)]);
    expect(outbox.parameters).not.toContain("site-from-the-request");
    expect(outbox.parameters).not.toContain(999);
  });

  it("raises the revision in the database rather than from the application clock", async () => {
    const client = buildClient();
    const repository = new DirectBookingWebsiteSiteRepository();

    await repository.upsertSiteWithStaticPageOutbox(PUBLISH_INPUT);

    const site = statementFor(client, /standalone_site/);
    expect(site.statement).toContain("static_page_revision = COALESCE(standalone_site.static_page_revision, 0) + 1");
    expect(site.statement).toContain("RETURNING");
    expect(site.statement).toContain("static_page_revision");
  });

  it("keeps one row per site so two publishes never queue duplicate work", async () => {
    const client = buildClient();
    const repository = new DirectBookingWebsiteSiteRepository();

    await repository.upsertSiteWithStaticPageOutbox(PUBLISH_INPUT);

    const outbox = statementFor(client, /static_page_outbox/);
    expect(outbox.statement).toContain("ON CONFLICT (site_id)");
    expect(outbox.statement).toContain("revision = EXCLUDED.revision");
    expect(outbox.statement).toContain("status = 'PENDING'");
    expect(outbox.statement).toContain("attempt_count = 0");
    expect(outbox.statement).toContain("failure_reason = NULL");
    expect(outbox.statement).toContain("processed_at = NULL");
  });

  it("reads the site row through the structured result, not the raw update shape", async () => {
    const client = buildClient();
    const repository = new DirectBookingWebsiteSiteRepository();

    await repository.upsertSiteWithStaticPageOutbox(PUBLISH_INPUT);

    for (const call of client.transactionRunner.query.mock.calls) {
      expect(call[2]).toBe(true);
    }
    expect(client.transactionRunner.release).not.toHaveBeenCalled();
  });
});

describe("every site query reports the static page revision", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the stored revision from the status update and the delete, not a silent zero", async () => {
    const records = [{ ...SITE_ROW, static_page_revision: 7 }];
    const queryRunner = {
      query: jest.fn(async () => ({ records, affected: 1 })),
      release: jest.fn().mockResolvedValue(undefined),
    };
    Database.getInstance.mockResolvedValue({
      options: { schema: "main" },
      createQueryRunner: jest.fn(() => queryRunner),
      query: jest.fn(async () => records),
    });
    const repository = new DirectBookingWebsiteSiteRepository();

    await expect(repository.updateSiteStatus("site-1", "preview")).resolves.toMatchObject({ staticPageRevision: 7 });
    await expect(repository.deleteSiteByPropertyIdAndHostId("property-1", "host-1")).resolves.toMatchObject({
      staticPageRevision: 7,
    });
    await expect(repository.getSiteById("site-1")).resolves.toMatchObject({ staticPageRevision: 7 });

    for (const call of queryRunner.query.mock.calls) {
      expect(call[0]).toContain("static_page_revision");
    }
  });

  it("reads a site that has never been published as revision zero", async () => {
    const records = [{ ...SITE_ROW, static_page_revision: null }];
    Database.getInstance.mockResolvedValue({
      options: { schema: "main" },
      createQueryRunner: jest.fn(() => ({
        query: jest.fn(async () => ({ records, affected: 1 })),
        release: jest.fn().mockResolvedValue(undefined),
      })),
      query: jest.fn(async () => records),
    });

    await expect(new DirectBookingWebsiteSiteRepository().getSiteById("site-1")).resolves.toMatchObject({
      staticPageRevision: 0,
    });
  });
});
