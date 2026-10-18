import { describe, expect, it, jest } from "@jest/globals";
import CredentialLeaseRepository from "../../functions/.shared/homeAutomation/repositories/credentialLeaseRepository.js";

const ACCOUNT = "account-1";
const OWNER = "owner-a";
const NOW = 1_800_000_000_000;
const TTL = 30_000;

const repositoryWith = (query, options = { schema: "test" }) => {
  const client = { options, query };
  const getClient = jest.fn().mockResolvedValue(client);
  return { repository: new CredentialLeaseRepository({ getClient }), getClient, query };
};

const acquire = (repository, owner = OWNER) => repository.tryAcquire(ACCOUNT, owner, { now: NOW, ttlMs: TTL });

describe("CredentialLeaseRepository.tryAcquire", () => {
  it("acquires a free lease and writes the account, owner, expiry and time", async () => {
    const { repository, query } = repositoryWith(jest.fn().mockResolvedValue([{ owner_id: OWNER }]));

    await expect(acquire(repository)).resolves.toBe(true);

    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain("INSERT INTO test.home_automation_credential_lease");
    expect(params).toEqual([ACCOUNT, OWNER, NOW + TTL, NOW]);
  });

  it("refuses a lease that is held, which is when no row comes back", async () => {
    const { repository } = repositoryWith(jest.fn().mockResolvedValue([]));

    await expect(acquire(repository)).resolves.toBe(false);
  });

  it("only takes over a lease that has expired", async () => {
    const { repository, query } = repositoryWith(jest.fn().mockResolvedValue([{ owner_id: OWNER }]));

    await acquire(repository);

    expect(query.mock.calls[0][0]).toContain("WHERE lease.lease_expires_at <= $4");
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

  it.each([
    ["an empty account id", ["", OWNER, { ttlMs: TTL }]],
    ["a blank owner id", [ACCOUNT, " ", { ttlMs: TTL }]],
    ["a missing ttl", [ACCOUNT, OWNER, {}]],
    ["a ttl of 0", [ACCOUNT, OWNER, { ttlMs: 0 }]],
    ["a negative ttl", [ACCOUNT, OWNER, { ttlMs: -5 }]],
    ["a fractional ttl", [ACCOUNT, OWNER, { ttlMs: 1.5 }]],
    ["a string now", [ACCOUNT, OWNER, { ttlMs: TTL, now: "1800000000000" }]],
    ["a fractional now", [ACCOUNT, OWNER, { ttlMs: TTL, now: 1.5 }]],
    ["a now of 0", [ACCOUNT, OWNER, { ttlMs: TTL, now: 0 }]],
  ])("rejects %s with a plain error before any query", async (_label, args) => {
    const { repository, getClient, query } = repositoryWith(jest.fn());

    const error = await repository.tryAcquire(...args).catch((caught) => caught);

    expect(error).toBeInstanceOf(Error);
    expect(getClient).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it("uses the main schema when the connection names none", async () => {
    const { repository, query } = repositoryWith(jest.fn().mockResolvedValue([]), {});

    await acquire(repository);

    expect(query.mock.calls[0][0]).toContain("INSERT INTO main.home_automation_credential_lease");
  });
});

describe("CredentialLeaseRepository.release", () => {
  it("releases a lease the caller owns", async () => {
    const { repository, query } = repositoryWith(jest.fn().mockResolvedValue([[{ owner_id: OWNER }], 1]));

    await expect(repository.release(ACCOUNT, OWNER, { now: NOW })).resolves.toBe(true);

    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain("SET lease_expires_at = 0");
    expect(params).toEqual([ACCOUNT, OWNER, NOW]);
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
    ["a string now", [ACCOUNT, OWNER, { now: "1800000000000" }]],
    ["a fractional now", [ACCOUNT, OWNER, { now: 1.5 }]],
    ["a now of 0", [ACCOUNT, OWNER, { now: 0 }]],
  ])("rejects %s with a plain error before any query", async (_label, args) => {
    const { repository, getClient, query } = repositoryWith(jest.fn());

    const error = await repository.release(...args).catch((caught) => caught);

    expect(error).toBeInstanceOf(Error);
    expect(getClient).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });
});

describe("CredentialLeaseRepository surface", () => {
  it("exposes only tryAcquire and release", () => {
    expect(Object.getOwnPropertyNames(CredentialLeaseRepository.prototype).sort()).toEqual([
      "constructor",
      "release",
      "tryAcquire",
    ]);
  });
});
