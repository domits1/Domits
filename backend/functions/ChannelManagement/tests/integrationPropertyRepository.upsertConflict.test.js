jest.mock("../../.shared/integrations/ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

import Database from "../../.shared/integrations/ORM/index.js";
import IntegrationPropertyRepository, {
  MappingConflictError,
} from "../../.shared/integrations/repositories/integrationPropertyRepository.js";

// The first getOne answers "does this exact mapping exist?", the second "is another one in use?".
const setup = ({ existing = null, inUseElsewhere = null } = {}) => {
  const read = {
    where: jest.fn(() => read),
    andWhere: jest.fn(() => read),
    getOne: jest.fn().mockResolvedValueOnce(existing).mockResolvedValueOnce(inUseElsewhere),
  };
  const write = {
    update: jest.fn(() => write),
    insert: jest.fn(() => write),
    into: jest.fn(() => write),
    set: jest.fn(() => write),
    values: jest.fn(() => write),
    where: jest.fn(() => write),
    execute: jest.fn(async () => undefined),
  };
  Database.getInstance.mockResolvedValue({
    getRepository: () => ({ createQueryBuilder: () => read }),
    createQueryBuilder: () => write,
  });
  return { repository: new IntegrationPropertyRepository(), read, write };
};

const mapping = (overrides = {}) => ({
  integrationAccountId: "account-1",
  domitsPropertyId: "listing-1",
  externalPropertyId: "channex-new",
  status: "ACTIVE",
  ...overrides,
});

// Design note D2: one in-use mapping per account and listing. A second live Channex property for the
// same listing would keep selling on the OTAs with frozen availability, so the save is refused and
// the host disconnects first (D5).
describe("IntegrationPropertyRepository.upsert refuses a second in-use mapping", () => {
  beforeEach(() => jest.clearAllMocks());

  test("refuses a new Channex property while another one is in use for the listing", async () => {
    const { repository, write } = setup({ inUseElsewhere: { id: "old", externalPropertyId: "channex-old" } });

    const saving = repository.upsert(mapping());

    await expect(saving).rejects.toBeInstanceOf(MappingConflictError);
    await expect(saving).rejects.toMatchObject({ existingExternalPropertyId: "channex-old" });
    expect(write.insert).not.toHaveBeenCalled();
  });

  test("refuses to re-activate an archived mapping while another one is in use", async () => {
    const { repository, write } = setup({
      existing: { id: "archived", externalPropertyId: "channex-new", status: "ARCHIVED" },
      inUseElsewhere: { id: "live", externalPropertyId: "channex-live" },
    });

    await expect(repository.upsert(mapping())).rejects.toBeInstanceOf(MappingConflictError);
    expect(write.update).not.toHaveBeenCalled();
  });

  test("saving the same Channex property again still updates it", async () => {
    const { repository, write } = setup({
      existing: { id: "same", externalPropertyId: "channex-new", status: "ACTIVE" },
    });

    await repository.upsert(mapping({ externalPropertyName: "Villa" }));

    expect(write.update).toHaveBeenCalled();
    expect(write.execute).toHaveBeenCalled();
  });

  test("looks for another in-use mapping of the same account and listing", async () => {
    const { repository, read } = setup();

    await repository.upsert(mapping());

    expect(read.where).toHaveBeenCalledWith("p.integrationAccountId = :a", { a: "account-1" });
    expect(read.andWhere).toHaveBeenCalledWith("p.domitsPropertyId = :d", { d: "listing-1" });
    // A claim in progress has no Channex id yet and must count as in use too.
    expect(read.andWhere).toHaveBeenCalledWith("(p.externalPropertyId IS NULL OR p.externalPropertyId <> :e)", {
      e: "channex-new",
    });
    // Same statuses as the partial unique index; one legacy row is stored as lowercase "active".
    expect(read.andWhere).toHaveBeenCalledWith("p.status IN (:...inUse)", {
      inUse: ["PROVISIONING", "ACTIVE", "active"],
    });
  });

  test("a mapping saved as not in use is never refused", async () => {
    const { repository, read, write } = setup({ inUseElsewhere: { id: "live", externalPropertyId: "channex-live" } });

    await repository.upsert(mapping({ status: "INACTIVE" }));

    expect(read.getOne).toHaveBeenCalledTimes(1);
    expect(write.insert).toHaveBeenCalled();
  });
});
