jest.mock("../../.shared/integrations/ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

import Database from "../../.shared/integrations/ORM/index.js";
import IntegrationPropertyRepository, {
  IN_USE_STATUSES,
} from "../../.shared/integrations/repositories/integrationPropertyRepository.js";

const setup = (found = null, count = 0) => {
  const read = {
    where: jest.fn(() => read),
    andWhere: jest.fn(() => read),
    getOne: jest.fn().mockResolvedValue(found),
    getCount: jest.fn().mockResolvedValue(count),
  };
  const write = {
    insert: jest.fn(() => write),
    into: jest.fn(() => write),
    values: jest.fn(() => write),
    update: jest.fn(() => write),
    set: jest.fn(() => write),
    where: jest.fn(() => write),
    andWhere: jest.fn(() => write),
    execute: jest.fn(async () => undefined),
  };
  Database.getInstance.mockResolvedValue({
    getRepository: () => ({ createQueryBuilder: () => read }),
    createQueryBuilder: () => write,
  });
  return { repository: new IntegrationPropertyRepository(), read, write };
};

// Design note D2 (#506): the claim row reserves a listing before Channex is called.
describe("IntegrationPropertyRepository claim", () => {
  test("finds the in-use mapping of an account and listing", async () => {
    const { repository, read } = setup({ id: "claim-1" });

    const row = await repository.findInUseByAccountAndListing("account-1", "listing-1");

    expect(read.where).toHaveBeenCalledWith("p.integrationAccountId = :a", { a: "account-1" });
    expect(read.andWhere).toHaveBeenCalledWith("p.domitsPropertyId = :d", { d: "listing-1" });
    expect(read.andWhere).toHaveBeenCalledWith("p.status IN (:...inUse)", { inUse: IN_USE_STATUSES });
    expect(row).toEqual({ id: "claim-1" });
  });

  test("returns null when the listing has no in-use mapping", async () => {
    setup(undefined);

    await expect(new IntegrationPropertyRepository().findInUseByAccountAndListing("a", "l")).resolves.toBeNull();
  });

  // Look before create: a Channex property is only adopted when no in-use mapping points to it.
  test.each([
    [0, false],
    [1, true],
  ])("with %p in-use mappings on a Channex property, isExternalPropertyInUse is %p", async (count, expected) => {
    const { repository, read } = setup(null, count);

    await expect(repository.isExternalPropertyInUse("channex-1")).resolves.toBe(expected);
    expect(read.where).toHaveBeenCalledWith("p.externalPropertyId = :e", { e: "channex-1" });
    expect(read.andWhere).toHaveBeenCalledWith("p.status IN (:...inUse)", { inUse: IN_USE_STATUSES });
  });

  // Saved before the next Channex call, so a later attempt continues from here.
  test("saves the Channex property on the claim while it is still PROVISIONING", async () => {
    const { repository, write } = setup();

    await repository.setClaimExternalProperty("claim-1", "channex-1", "Villa Malee");

    expect(write.set).toHaveBeenCalledWith(
      expect.objectContaining({ externalPropertyId: "channex-1", externalPropertyName: "Villa Malee" })
    );
    expect(write.where).toHaveBeenCalledWith("id = :id", { id: "claim-1" });
    expect(write.andWhere).toHaveBeenCalledWith("status = :s", { s: "PROVISIONING" });
  });

  // Runs inside the caller's transaction, together with the full sync (design note D2, step 3d-4).
  test("activates a claim that is still PROVISIONING, on the caller's transaction", async () => {
    const write = {
      update: jest.fn(() => write),
      set: jest.fn(() => write),
      where: jest.fn(() => write),
      andWhere: jest.fn(() => write),
      execute: jest.fn(async () => undefined),
    };
    const manager = { createQueryBuilder: () => write };

    await new IntegrationPropertyRepository().activateClaim(manager, "claim-1");

    expect(write.set).toHaveBeenCalledWith(expect.objectContaining({ status: "ACTIVE" }));
    expect(write.where).toHaveBeenCalledWith("id = :id", { id: "claim-1" });
    expect(write.andWhere).toHaveBeenCalledWith("status = :s", { s: "PROVISIONING" });
  });

  // #4031 review: only one of two requests that find the same stale claim may take it over.
  test.each([
    [1, true],
    [0, false],
  ])("taking over a claim that updated %p rows answers %p", async (affected, expected) => {
    const write = {
      update: jest.fn(() => write),
      set: jest.fn(() => write),
      where: jest.fn(() => write),
      andWhere: jest.fn(() => write),
      execute: jest.fn(async () => ({ affected })),
    };
    Database.getInstance.mockResolvedValue({ createQueryBuilder: () => write });

    const won = await new IntegrationPropertyRepository().takeOverClaim({ claimId: "claim-1", expectedUpdatedAt: 5, now: 9 });

    expect(won).toBe(expected);
    expect(write.set).toHaveBeenCalledWith({ updatedAt: 9 });
    expect(write.where).toHaveBeenCalledWith("id = :id", { id: "claim-1" });
    expect(write.andWhere).toHaveBeenCalledWith("status = :s", { s: "PROVISIONING" });
    expect(write.andWhere).toHaveBeenCalledWith('"updatedAt" = :expected', { expected: 5 });
  });

  // The partial unique key decides the race; the insert does not look first.
  test("inserts a PROVISIONING row without a Channex property yet", async () => {
    const { repository, write } = setup();

    await repository.insertClaim({ id: "claim-1", integrationAccountId: "account-1", domitsPropertyId: "listing-1", now: 5 });

    expect(write.values).toHaveBeenCalledWith({
      id: "claim-1",
      integrationAccountId: "account-1",
      domitsPropertyId: "listing-1",
      externalPropertyId: null,
      externalPropertyName: null,
      status: "PROVISIONING",
      createdAt: 5,
      updatedAt: 5,
    });
  });
});
