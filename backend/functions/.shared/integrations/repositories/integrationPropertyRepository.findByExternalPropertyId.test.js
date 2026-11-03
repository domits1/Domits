jest.mock("../ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const Database = require("../ORM/index.js").default;
const IntegrationPropertyRepository = require("./integrationPropertyRepository.js").default;

describe("IntegrationPropertyRepository.findByExternalPropertyId", () => {
  test("matches only ACTIVE mappings, ordered newest-updatedAt-first, returning the full list", async () => {
    const activeMappings = [
      {
        id: "property-link-2",
        integrationAccountId: "integration-2",
        domitsPropertyId: "domits-property-1",
        externalPropertyId: "channex-property-1",
        status: "ACTIVE",
        updatedAt: 2000,
      },
      {
        id: "property-link-1",
        integrationAccountId: "integration-1",
        domitsPropertyId: "domits-property-1",
        externalPropertyId: "channex-property-1",
        status: "ACTIVE",
        updatedAt: 1000,
      },
    ];
    const getMany = jest.fn(async () => activeMappings);
    const orderBy = jest.fn(() => ({ getMany }));
    const andWhere = jest.fn(() => ({ orderBy }));
    const where = jest.fn(() => ({ andWhere }));
    const createQueryBuilder = jest.fn(() => ({ where }));
    Database.getInstance.mockResolvedValue({
      getRepository: jest.fn(() => ({ createQueryBuilder })),
    });

    const repository = new IntegrationPropertyRepository();
    const result = await repository.findByExternalPropertyId("channex-property-1");

    expect(where).toHaveBeenCalledWith("p.externalPropertyId = :e", { e: "channex-property-1" });
    expect(andWhere).toHaveBeenCalledWith("p.status = :s", { s: "ACTIVE" });
    expect(orderBy).toHaveBeenCalledWith("p.updatedAt", "DESC");
    expect(result).toEqual(activeMappings);
  });
});
