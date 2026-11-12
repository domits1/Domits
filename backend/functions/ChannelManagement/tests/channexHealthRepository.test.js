jest.mock("../../.shared/integrations/ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

import Database from "../../.shared/integrations/ORM/index.js";
import ChannexHealthRepository from "../../.shared/channelManagement/repositories/channexHealthRepository.js";

const NOW = 1_750_000_000_000;

// A query builder that records its calls and answers with the given result.
const buildQuery = ({ one, rawOne, rawMany } = {}) => {
  const builder = {
    select: jest.fn(() => builder),
    addSelect: jest.fn(() => builder),
    where: jest.fn(() => builder),
    andWhere: jest.fn(() => builder),
    groupBy: jest.fn(() => builder),
    orderBy: jest.fn(() => builder),
    getOne: jest.fn(async () => one),
    getRawOne: jest.fn(async () => rawOne),
    getRawMany: jest.fn(async () => rawMany),
  };
  Database.getInstance.mockResolvedValue({ getRepository: () => ({ createQueryBuilder: () => builder }) });
  return builder;
};

const repositoryWithAccounts = (accounts = []) => {
  const integrationAccounts = { listByChannel: jest.fn(async () => accounts) };
  return { repository: new ChannexHealthRepository({ integrationAccounts }), integrationAccounts };
};

describe("ChannexHealthRepository.lastRevisionAt", () => {
  // The revision table has quoted camelCase columns; the query builder quotes r.createdAt from the entity.
  test("reads the newest booking revision time through the entity", async () => {
    const builder = buildQuery({ rawOne: { lastRevisionAt: String(NOW) } });

    const lastRevisionAt = await repositoryWithAccounts().repository.lastRevisionAt();

    expect(builder.select).toHaveBeenCalledWith("MAX(r.createdAt)", "lastRevisionAt");
    expect(lastRevisionAt).toBe(NOW);
  });

  test("gives null when no booking revision was ever received", async () => {
    buildQuery({ rawOne: { lastRevisionAt: null } });

    await expect(repositoryWithAccounts().repository.lastRevisionAt()).resolves.toBeNull();
  });
});

describe("ChannexHealthRepository.lastPoll", () => {
  test("reads the newest booking poll run and how it ended", async () => {
    const builder = buildQuery({ one: { lastSyncedAt: String(NOW), status: "SUCCESS" } });

    const lastPoll = await repositoryWithAccounts().repository.lastPoll();

    expect(builder.where).toHaveBeenCalledWith("s.syncType LIKE :prefix", { prefix: "booking_poll:%" });
    expect(builder.orderBy).toHaveBeenCalledWith("s.lastSyncedAt", "DESC");
    expect(lastPoll).toEqual({ lastPollAt: NOW, lastPollStatus: "SUCCESS" });
  });

  // Postgres sorts NULL first in DESC order, so a row that never ran would win.
  test("skips poll rows that never ran", async () => {
    const builder = buildQuery({ one: null });

    await repositoryWithAccounts().repository.lastPoll();

    expect(builder.andWhere).toHaveBeenCalledWith("s.lastSyncedAt IS NOT NULL");
  });

  test("gives nulls when polling never ran", async () => {
    buildQuery({ one: null });

    await expect(repositoryWithAccounts().repository.lastPoll()).resolves.toEqual({
      lastPollAt: null,
      lastPollStatus: null,
    });
  });
});

describe("ChannexHealthRepository.accounts", () => {
  test("lists the Channex accounts with their number of active mappings, without credentials", async () => {
    const builder = buildQuery({ rawMany: [{ integrationAccountId: "account-1", mapped: "2" }] });
    const { repository, integrationAccounts } = repositoryWithAccounts([
      {
        id: "account-1",
        displayName: "Villa host",
        status: "CONNECTED",
        lastErrorCode: null,
        credentialsRef: "secret-arn",
        userId: "user-1",
      },
      { id: "account-2", displayName: "Old test host", status: "RECONNECT_REQUIRED", lastErrorCode: "401" },
    ]);

    const accounts = await repository.accounts();

    expect(integrationAccounts.listByChannel).toHaveBeenCalledWith("CHANNEX");
    expect(builder.andWhere).toHaveBeenCalledWith("UPPER(p.status) = :status", { status: "ACTIVE" });
    expect(builder.groupBy).toHaveBeenCalledWith("p.integrationAccountId");
    expect(accounts).toEqual([
      { id: "account-1", displayName: "Villa host", status: "CONNECTED", lastErrorCode: null, mappedProperties: 2 },
      {
        id: "account-2",
        displayName: "Old test host",
        status: "RECONNECT_REQUIRED",
        lastErrorCode: "401",
        mappedProperties: 0,
      },
    ]);
  });

  test("does not count mappings when there are no Channex accounts", async () => {
    const builder = buildQuery({ rawMany: [] });

    await expect(repositoryWithAccounts([]).repository.accounts()).resolves.toEqual([]);
    expect(builder.getRawMany).not.toHaveBeenCalled();
  });
});
