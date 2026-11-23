jest.mock("../../.shared/integrations/ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

import Database from "../../.shared/integrations/ORM/index.js";
import IntegrationPropertyRepository, {
  IN_USE_STATUSES,
} from "../../.shared/integrations/repositories/integrationPropertyRepository.js";

const setup = (found = null) => {
  const read = {
    where: jest.fn(() => read),
    andWhere: jest.fn(() => read),
    getOne: jest.fn().mockResolvedValue(found),
  };
  const write = {
    insert: jest.fn(() => write),
    into: jest.fn(() => write),
    values: jest.fn(() => write),
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
