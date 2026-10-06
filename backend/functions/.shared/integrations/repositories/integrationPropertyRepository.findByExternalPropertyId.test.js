jest.mock("../ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const Database = require("../ORM/index.js").default;
const IntegrationPropertyRepository = require("./integrationPropertyRepository.js").default;

describe("IntegrationPropertyRepository.findByExternalPropertyId", () => {
  test("returns the matching existing mapping", async () => {
    const existingMapping = {
      id: "property-link-1",
      integrationAccountId: "integration-1",
      domitsPropertyId: "domits-property-1",
      externalPropertyId: "channex-property-1",
      externalPropertyName: "Beach House",
      status: "ACTIVE",
    };
    const getOne = jest.fn(async () => existingMapping);
    const where = jest.fn(() => ({ getOne }));
    const createQueryBuilder = jest.fn(() => ({ where }));
    Database.getInstance.mockResolvedValue({
      getRepository: jest.fn(() => ({ createQueryBuilder })),
    });

    const repository = new IntegrationPropertyRepository();
    const result = await repository.findByExternalPropertyId("channex-property-1");

    expect(result).toEqual(existingMapping);
    expect(where).toHaveBeenCalledWith("p.externalPropertyId = :e", { e: "channex-property-1" });
  });
});
