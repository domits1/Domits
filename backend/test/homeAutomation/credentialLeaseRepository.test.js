import { afterEach, describe, expect, it, jest } from "@jest/globals";
import CredentialLeaseRepository, {
  MAX_LEASE_TTL_MS,
} from "../../functions/.shared/homeAutomation/repositories/credentialLeaseRepository.js";

const ACCOUNT = "account-1";
const OWNER = "owner-a";
const TTL = 30_000;
const MARGIN = 5_000;
const DATABASE_CLOCK = "EXTRACT(EPOCH FROM now())";

const repositoryWith = (query, options = { schema: "test" }) => {
  const client = { options, query };
  const getClient = jest.fn().mockResolvedValue(client);
  return { repository: new CredentialLeaseRepository({ getClient }), getClient, query };
};

const acquire = (repository, owner = OWNER) => repository.tryAcquire(ACCOUNT, owner, { ttlMs: TTL });
const fence = (repository, owner = OWNER) => repository.isHeldBy(ACCOUNT, owner, { minRemainingMs: MARGIN });

const expectRejectedBeforeAnyQuery = async (call, { getClient, query }) => {
  const error = await call().catch((caught) => caught);

  expect(error).toBeInstanceOf(Error);
  expect(getClient).not.toHaveBeenCalled();
  expect(query).not.toHaveBeenCalled();
};

afterEach(() => jest.restoreAllMocks());

describe("CredentialLeaseRepository.tryAcquire", () => {
  it("acquires a free lease and sends only the account, owner and ttl", async () => {
    const { repository, query } = repositoryWith(jest.fn().mockResolvedValue([{ owner_id: OWNER }]));

    await expect(acquire(repository)).resolves.toBe(true);

    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain("INSERT INTO test.home_automation_credential_lease");
    expect(params).toEqual([ACCOUNT, OWNER, TTL]);
  });

  it("takes the time from the database, not from the Lambda", async () => {
    const clock = jest.spyOn(Date, "now");
    const { repository, query } = repositoryWith(jest.fn().mockResolvedValue([{ owner_id: OWNER }]));

    await acquire(repository);

    expect(query.mock.calls[0][0]).toContain(DATABASE_CLOCK);
    expect(clock).not.toHaveBeenCalled();
  });

  it("refuses a lease that is held, which is when no row comes back", async () => {
    const { repository } = repositoryWith(jest.fn().mockResolvedValue([]));

    await expect(acquire(repository)).resolves.toBe(false);
  });

  it("only takes over a lease that has expired", async () => {
    const { repository, query } = repositoryWith(jest.fn().mockResolvedValue([{ owner_id: OWNER }]));

    await acquire(repository);

    expect(query.mock.calls[0][0]).toContain("WHERE lease.lease_expires_at <= EXCLUDED.updated_at");
  });

  it("does not report success for a row that belongs to another owner", async () => {
    const { repository } = repositoryWith(jest.fn().mockResolvedValue([{ owner_id: "someone-else" }]));

    await expect(acquire(repository)).resolves.toBe(false);
  });

  it.each([
    ["40001", { code: "40001" }],
    ["OC001", { code: "OC001" }],
    ["a driver error code", { driverError: { code: "40001" } }],
  ])("treats a DSQL conflict (%s) as not acquired", async (_label, conflict) => {
    const { repository } = repositoryWith(jest.fn().mockRejectedValue(Object.assign(new Error("conflict"), conflict)));

    await expect(acquire(repository)).resolves.toBe(false);
  });

  it("throws any other error", async () => {
    const { repository } = repositoryWith(jest.fn().mockRejectedValue(new Error("connection reset")));

    await expect(acquire(repository)).rejects.toThrow("connection reset");
  });

  it("accepts a ttl of exactly the cap", async () => {
    const { repository } = repositoryWith(jest.fn().mockResolvedValue([{ owner_id: OWNER }]));

    await expect(repository.tryAcquire(ACCOUNT, OWNER, { ttlMs: MAX_LEASE_TTL_MS })).resolves.toBe(true);
  });

  it.each([
    ["an empty account id", ["", OWNER, { ttlMs: TTL }]],
    ["a blank owner id", [ACCOUNT, " ", { ttlMs: TTL }]],
    ["a missing ttl", [ACCOUNT, OWNER, {}]],
    ["a ttl of 0", [ACCOUNT, OWNER, { ttlMs: 0 }]],
    ["a negative ttl", [ACCOUNT, OWNER, { ttlMs: -5 }]],
    ["a fractional ttl", [ACCOUNT, OWNER, { ttlMs: 1.5 }]],
    ["a ttl above the cap", [ACCOUNT, OWNER, { ttlMs: MAX_LEASE_TTL_MS + 1 }]],
  ])("rejects %s with a plain error before any query", async (_label, args) => {
    const mocks = repositoryWith(jest.fn());

    await expectRejectedBeforeAnyQuery(() => mocks.repository.tryAcquire(...args), mocks);
  });

  it("uses the main schema when the connection names none", async () => {
    const { repository, query } = repositoryWith(jest.fn().mockResolvedValue([]), {});

    await acquire(repository);

    expect(query.mock.calls[0][0]).toContain("INSERT INTO main.home_automation_credential_lease");
  });
});

describe("CredentialLeaseRepository.release", () => {
  it("releases a lease the caller owns, with the time taken from the database", async () => {
    const clock = jest.spyOn(Date, "now");
    const { repository, query } = repositoryWith(jest.fn().mockResolvedValue([[{ owner_id: OWNER }], 1]));

    await expect(repository.release(ACCOUNT, OWNER)).resolves.toBe(true);

    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain("SET lease_expires_at = 0");
    expect(sql).toContain(DATABASE_CLOCK);
    expect(params).toEqual([ACCOUNT, OWNER]);
    expect(clock).not.toHaveBeenCalled();
  });

  it("only matches the owner, so another owner's lease is left alone", async () => {
    const { repository, query } = repositoryWith(jest.fn().mockResolvedValue([[], 0]));

    await expect(repository.release(ACCOUNT, "not-the-owner")).resolves.toBe(false);

    expect(query.mock.calls[0][0]).toContain("WHERE integration_account_id = $1 AND owner_id = $2");
  });

  it("treats a DSQL conflict as not released", async () => {
    const { repository } = repositoryWith(
      jest.fn().mockRejectedValue(Object.assign(new Error("c"), { code: "40001" }))
    );

    await expect(repository.release(ACCOUNT, OWNER)).resolves.toBe(false);
  });

  it("throws any other error", async () => {
    const { repository } = repositoryWith(jest.fn().mockRejectedValue(new Error("connection reset")));

    await expect(repository.release(ACCOUNT, OWNER)).rejects.toThrow("connection reset");
  });

  it.each([
    ["an empty account id", ["", OWNER]],
    ["a blank owner id", [ACCOUNT, "  "]],
  ])("rejects %s with a plain error before any query", async (_label, args) => {
    const mocks = repositoryWith(jest.fn());

    await expectRejectedBeforeAnyQuery(() => mocks.repository.release(...args), mocks);
  });
});

describe("CredentialLeaseRepository.isHeldBy", () => {
  it("is true when the owner's row has more than the margin left", async () => {
    const { repository, query } = repositoryWith(jest.fn().mockResolvedValue([{ "?column?": 1 }]));

    await expect(fence(repository)).resolves.toBe(true);

    expect(query.mock.calls[0][1]).toEqual([ACCOUNT, OWNER, MARGIN]);
  });

  it("is false when no row matches: expired, too short, another owner or no lease", async () => {
    const { repository } = repositoryWith(jest.fn().mockResolvedValue([]));

    await expect(fence(repository)).resolves.toBe(false);
  });

  it("asks for the owner and for strictly more than the margin, by the database clock", async () => {
    const clock = jest.spyOn(Date, "now");
    const { repository, query } = repositoryWith(jest.fn().mockResolvedValue([]));

    await fence(repository);

    const sql = query.mock.calls[0][0].replaceAll(/\s+/g, " ");
    expect(sql).toContain("FROM test.home_automation_credential_lease");
    expect(sql).toContain("integration_account_id = $1 AND owner_id = $2");
    expect(sql).toContain(`lease_expires_at > (floor(${DATABASE_CLOCK} * 1000))::bigint + $3::bigint`);
    expect(clock).not.toHaveBeenCalled();
  });

  it("only reads", async () => {
    const { repository, query } = repositoryWith(jest.fn().mockResolvedValue([]));

    await fence(repository);

    expect(query.mock.calls[0][0].trimStart()).toMatch(/^SELECT/);
  });

  it("answers false on a DSQL conflict, so a fence fails closed", async () => {
    const { repository } = repositoryWith(
      jest.fn().mockRejectedValue(Object.assign(new Error("c"), { code: "40001" }))
    );

    await expect(fence(repository)).resolves.toBe(false);
  });

  it("throws any other error", async () => {
    const { repository } = repositoryWith(jest.fn().mockRejectedValue(new Error("connection reset")));

    await expect(fence(repository)).rejects.toThrow("connection reset");
  });

  it.each([0, MAX_LEASE_TTL_MS - 1])("accepts a margin of %i", async (minRemainingMs) => {
    const { repository } = repositoryWith(jest.fn().mockResolvedValue([]));

    await expect(repository.isHeldBy(ACCOUNT, OWNER, { minRemainingMs })).resolves.toBe(false);
  });

  it.each([
    ["an empty account id", ["", OWNER, { minRemainingMs: MARGIN }]],
    ["a blank owner id", [ACCOUNT, " ", { minRemainingMs: MARGIN }]],
    ["no options", [ACCOUNT, OWNER]],
    ["a missing margin", [ACCOUNT, OWNER, {}]],
    ["a negative margin", [ACCOUNT, OWNER, { minRemainingMs: -1 }]],
    ["a fractional margin", [ACCOUNT, OWNER, { minRemainingMs: 1.5 }]],
    ["a string margin", [ACCOUNT, OWNER, { minRemainingMs: "5000" }]],
    ["a margin equal to the cap, which could never hold", [ACCOUNT, OWNER, { minRemainingMs: MAX_LEASE_TTL_MS }]],
    ["a margin above the cap", [ACCOUNT, OWNER, { minRemainingMs: MAX_LEASE_TTL_MS + 1 }]],
  ])("rejects %s with a plain error before any query", async (_label, args) => {
    const mocks = repositoryWith(jest.fn());

    await expectRejectedBeforeAnyQuery(() => mocks.repository.isHeldBy(...args), mocks);
  });
});

describe("CredentialLeaseRepository surface", () => {
  it("exposes only tryAcquire, release and isHeldBy", () => {
    expect(Object.getOwnPropertyNames(CredentialLeaseRepository.prototype).sort()).toEqual([
      "constructor",
      "isHeldBy",
      "release",
      "tryAcquire",
    ]);
  });
});
