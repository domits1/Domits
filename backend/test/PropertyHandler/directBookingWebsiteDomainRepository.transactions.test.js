import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import Database from "database";
import { DirectBookingWebsiteDomainRepository } from "../../functions/PropertyHandler/data/repository/directBookingWebsiteDomainRepository.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const CUSTOM_ROW = {
  id: "domain-1",
  site_id: "site-1",
  domain: "www.example.com",
  domain_type: "CUSTOM",
  status: "REMOVING",
  is_primary: true,
  verification_details_json: JSON.stringify({ tenantId: "dt_1" }),
  last_checked_at: 1757000000000,
  created_at: 1757000000000,
  updated_at: 1757000000000,
};

const FALLBACK_ROW = { ...CUSTOM_ROW, id: "domain-0", domain_type: "FALLBACK", is_primary: true, status: "ACTIVE" };

const conflictError = (code) => Object.assign(new Error("serialization failure"), { code });

const buildRunner = (responses, { failBegin = null, failCommit = null, failRollback = null } = {}) => {
  const runner = {
    isTransactionActive: false,
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn(async () => {
      runner.isTransactionActive = true;
      if (failBegin) {
        throw failBegin;
      }
    }),
    commitTransaction: jest.fn(async () => {
      if (failCommit) {
        throw failCommit;
      }
      runner.isTransactionActive = false;
    }),
    rollbackTransaction: jest.fn(async () => {
      if (failRollback) {
        throw failRollback;
      }
      runner.isTransactionActive = false;
    }),
    release: jest.fn().mockResolvedValue(undefined),
    releasePostgresConnection: jest.fn().mockResolvedValue(undefined),
    query: jest.fn(async () => {
      const next = responses.shift();
      if (next instanceof Error) {
        throw next;
      }
      return next;
    }),
  };
  return runner;
};

const buildClient = (runners) => {
  const created = [];
  const client = {
    options: { schema: "main" },
    query: jest.fn().mockResolvedValue([]),
    createQueryRunner: jest.fn(() => {
      const runner = runners.shift();
      created.push(runner);
      return runner;
    }),
  };
  Database.getInstance.mockResolvedValue(client);
  return { client, created };
};

describe("DirectBookingWebsiteDomainRepository transactional hand-back", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("writes the status and the fallback restore in one committed transaction", async () => {
    const runner = buildRunner([
      { records: [CUSTOM_ROW], affected: 1 },
      {
        records: [
          { ...FALLBACK_ROW, is_primary: true },
          { ...CUSTOM_ROW, is_primary: false },
        ],
        affected: 2,
      },
    ]);
    buildClient([runner]);

    const result = await new DirectBookingWebsiteDomainRepository().updateDomainStatusAndRestoreFallbackById(
      "domain-1",
      "site-1",
      "REMOVING",
      { tenantId: "dt_1" }
    );

    expect(runner.startTransaction).toHaveBeenCalledTimes(1);
    expect(runner.commitTransaction).toHaveBeenCalledTimes(1);
    expect(runner.rollbackTransaction).not.toHaveBeenCalled();
    expect(runner.release).toHaveBeenCalledTimes(1);
    expect(runner.query.mock.calls[0][0]).toContain("UPDATE");
    expect(runner.query.mock.calls[1][0]).toContain("is_primary = (domain_type = 'FALLBACK')");
    expect(result.record).toMatchObject({ id: "domain-1", status: "REMOVING" });
    expect(result.changedRecords.map((entry) => entry.id)).toEqual(["domain-0", "domain-1"]);
  });

  it("rolls back and releases when the second statement fails, and surfaces the error", async () => {
    const runner = buildRunner([{ records: [CUSTOM_ROW], affected: 1 }, new Error("restore unavailable")]);
    buildClient([runner]);

    await expect(
      new DirectBookingWebsiteDomainRepository().updateDomainStatusAndRestoreFallbackById(
        "domain-1",
        "site-1",
        "REMOVING",
        {}
      )
    ).rejects.toThrow("restore unavailable");

    expect(runner.commitTransaction).not.toHaveBeenCalled();
    expect(runner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(runner.release).toHaveBeenCalledTimes(1);
  });

  it.each(["40001", "OC001"])("retries the transaction once when the commit conflicts with %s", async (code) => {
    const failing = buildRunner([{ records: [CUSTOM_ROW], affected: 1 }], { failCommit: conflictError(code) });
    const succeeding = buildRunner([
      { records: [CUSTOM_ROW], affected: 1 },
      { records: [{ ...FALLBACK_ROW, is_primary: true }], affected: 1 },
    ]);
    buildClient([failing, succeeding]);

    const result = await new DirectBookingWebsiteDomainRepository().updateDomainStatusAndRestoreFallbackById(
      "domain-1",
      "site-1",
      "REMOVING",
      {}
    );

    expect(failing.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(failing.release).toHaveBeenCalledTimes(1);
    expect(succeeding.commitTransaction).toHaveBeenCalledTimes(1);
    expect(succeeding.release).toHaveBeenCalledTimes(1);
    expect(result.record).toMatchObject({ id: "domain-1" });
  });

  it("gives up after a second conflict instead of retrying forever", async () => {
    const buildConflicting = () =>
      buildRunner([{ records: [CUSTOM_ROW], affected: 1 }], { failCommit: conflictError("40001") });
    const runners = [buildConflicting(), buildConflicting()];
    const { client } = buildClient([...runners]);

    await expect(
      new DirectBookingWebsiteDomainRepository().updateDomainStatusAndRestoreFallbackById(
        "domain-1",
        "site-1",
        "REMOVING",
        {}
      )
    ).rejects.toMatchObject({ code: "40001" });

    expect(client.createQueryRunner).toHaveBeenCalledTimes(2);
    runners.forEach((runner) => expect(runner.release).toHaveBeenCalledTimes(1));
  });

  it("skips the fallback restore when the status update matched no row", async () => {
    const runner = buildRunner([{ records: [], affected: 0 }]);
    buildClient([runner]);

    const result = await new DirectBookingWebsiteDomainRepository().updateDomainStatusAndRestoreFallbackById(
      "domain-1",
      "site-1",
      "REMOVING",
      {}
    );

    expect(result).toEqual({ record: null, changedRecords: [] });
    expect(runner.query).toHaveBeenCalledTimes(1);
    expect(runner.commitTransaction).toHaveBeenCalledTimes(1);
    expect(runner.release).toHaveBeenCalledTimes(1);
  });

  it("deletes the row and restores the fallback in one committed transaction", async () => {
    const runner = buildRunner([
      { records: [{ id: "domain-1" }], affected: 1 },
      { records: [{ ...FALLBACK_ROW, is_primary: true }], affected: 1 },
    ]);
    buildClient([runner]);

    const result = await new DirectBookingWebsiteDomainRepository().deleteDomainAndRestoreFallbackById(
      "domain-1",
      "site-1"
    );

    expect(runner.query.mock.calls[0][0]).toContain("DELETE FROM");
    expect(runner.query.mock.calls[1][0]).toContain("is_primary = (domain_type = 'FALLBACK')");
    expect(runner.commitTransaction).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ deleted: true });
    expect(result.changedRecords.map((entry) => entry.id)).toEqual(["domain-0"]);
  });

  it("skips the fallback restore when the delete removed no row", async () => {
    const runner = buildRunner([{ records: [], affected: 0 }]);
    buildClient([runner]);

    const result = await new DirectBookingWebsiteDomainRepository().deleteDomainAndRestoreFallbackById(
      "domain-1",
      "site-1"
    );

    expect(result).toEqual({ deleted: false, changedRecords: [] });
    expect(runner.query).toHaveBeenCalledTimes(1);
    expect(runner.release).toHaveBeenCalledTimes(1);
  });

  it("rolls back and releases when the transaction fails to begin", async () => {
    const runner = buildRunner([], { failBegin: new Error("could not start transaction") });
    buildClient([runner]);

    await expect(
      new DirectBookingWebsiteDomainRepository().deleteDomainAndRestoreFallbackById("domain-1", "site-1")
    ).rejects.toThrow("could not start transaction");

    expect(runner.isTransactionActive).toBe(false);
    expect(runner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(runner.query).not.toHaveBeenCalled();
    expect(runner.release).toHaveBeenCalledTimes(1);
    expect(runner.releasePostgresConnection).not.toHaveBeenCalled();
  });

  it("discards the connection instead of pooling it when the rollback fails", async () => {
    const rollbackFailure = new Error("rollback refused");
    const runner = buildRunner([{ records: [CUSTOM_ROW], affected: 1 }, new Error("restore unavailable")], {
      failRollback: rollbackFailure,
    });
    buildClient([runner]);
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    try {
      await expect(
        new DirectBookingWebsiteDomainRepository().updateDomainStatusAndRestoreFallbackById(
          "domain-1",
          "site-1",
          "REMOVING",
          {}
        )
      ).rejects.toThrow("restore unavailable");

      expect(runner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(runner.releasePostgresConnection).toHaveBeenCalledWith(rollbackFailure);
      expect(runner.release).not.toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  it("falls back to a plain release when the runner cannot discard its connection", async () => {
    const runner = buildRunner([{ records: [CUSTOM_ROW], affected: 1 }, new Error("restore unavailable")], {
      failRollback: new Error("rollback refused"),
    });
    delete runner.releasePostgresConnection;
    buildClient([runner]);
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    try {
      await expect(
        new DirectBookingWebsiteDomainRepository().updateDomainStatusAndRestoreFallbackById(
          "domain-1",
          "site-1",
          "REMOVING",
          {}
        )
      ).rejects.toThrow("restore unavailable");

      expect(runner.release).toHaveBeenCalledTimes(1);
    } finally {
      consoleError.mockRestore();
    }
  });

  it("returns the connection to the pool when the rollback succeeds", async () => {
    const runner = buildRunner([{ records: [CUSTOM_ROW], affected: 1 }, new Error("restore unavailable")]);
    buildClient([runner]);

    await expect(
      new DirectBookingWebsiteDomainRepository().updateDomainStatusAndRestoreFallbackById(
        "domain-1",
        "site-1",
        "REMOVING",
        {}
      )
    ).rejects.toThrow("restore unavailable");

    expect(runner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(runner.release).toHaveBeenCalledTimes(1);
    expect(runner.releasePostgresConnection).not.toHaveBeenCalled();
  });
});

describe("DirectBookingWebsiteDomainRepository.claimCustomDomain", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("inserts without overwriting an existing row and reports the row as created", async () => {
    const runner = buildRunner([{ records: [{ ...CUSTOM_ROW, status: "PENDING", is_primary: false }], affected: 1 }]);
    const { client } = buildClient([runner]);

    const result = await new DirectBookingWebsiteDomainRepository().claimCustomDomain({
      siteId: "site-1",
      domain: "WWW.Example.com",
      status: "PENDING",
      verificationDetails: { reason: "dns_required" },
    });

    const statement = runner.query.mock.calls[0][0];
    expect(statement).toContain("ON CONFLICT (domain) DO NOTHING");
    expect(statement).not.toContain("DO UPDATE");
    expect(runner.query.mock.calls[0][1][2]).toBe("www.example.com");
    expect(runner.query.mock.calls[0][1][5]).toBe(false);
    expect(client.query).not.toHaveBeenCalled();
    expect(result).toMatchObject({ created: true });
    expect(result.record).toMatchObject({ id: "domain-1", siteId: "site-1" });
  });

  it("rereads and reports the stored row untouched when the insert conflicted", async () => {
    const runner = buildRunner([{ records: [], affected: 0 }]);
    const { client } = buildClient([runner]);
    client.query.mockResolvedValue([{ ...CUSTOM_ROW, status: "ACTIVE", is_primary: true }]);

    const result = await new DirectBookingWebsiteDomainRepository().claimCustomDomain({
      siteId: "site-1",
      domain: "www.example.com",
      status: "PENDING",
      verificationDetails: {},
    });

    expect(result.created).toBe(false);
    expect(result.record).toMatchObject({ status: "ACTIVE", isPrimary: true, siteId: "site-1" });
    expect(result.record.verificationDetails).toEqual({ tenantId: "dt_1" });
  });

  it("reports the owning row when the domain belongs to another site", async () => {
    const runner = buildRunner([{ records: [], affected: 0 }]);
    const { client } = buildClient([runner]);
    client.query.mockResolvedValue([{ ...CUSTOM_ROW, site_id: "site-2" }]);

    const result = await new DirectBookingWebsiteDomainRepository().claimCustomDomain({
      siteId: "site-1",
      domain: "www.example.com",
      status: "PENDING",
      verificationDetails: {},
    });

    expect(result).toMatchObject({ created: false });
    expect(result.record.siteId).toBe("site-2");
  });

  it("retries once and reports nothing when the conflicting row disappears before the reread", async () => {
    const first = buildRunner([{ records: [], affected: 0 }]);
    const second = buildRunner([{ records: [], affected: 0 }]);
    const { client } = buildClient([first, second]);
    client.query.mockResolvedValue([]);

    const result = await new DirectBookingWebsiteDomainRepository().claimCustomDomain({
      siteId: "site-1",
      domain: "www.example.com",
      status: "PENDING",
      verificationDetails: {},
    });

    expect(result).toEqual({ record: null, created: false });
    expect(client.createQueryRunner).toHaveBeenCalledTimes(2);
  });
});
