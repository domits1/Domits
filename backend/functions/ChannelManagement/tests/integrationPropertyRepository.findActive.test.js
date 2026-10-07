jest.mock("../../.shared/integrations/ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

import Database from "../../.shared/integrations/ORM/index.js";
import IntegrationPropertyRepository from "../../.shared/integrations/repositories/integrationPropertyRepository.js";

describe("IntegrationPropertyRepository.listActiveByDomitsPropertyId", () => {
  test("asks only for ACTIVE mappings of this one Domits property", async () => {
    const builder = {
      where: jest.fn(() => builder),
      andWhere: jest.fn(() => builder),
      orderBy: jest.fn(() => builder),
      getMany: jest.fn(async () => [{ id: "mapping-1" }]),
    };
    Database.getInstance.mockResolvedValue({
      getRepository: () => ({ createQueryBuilder: () => builder }),
    });

    const rows = await new IntegrationPropertyRepository().listActiveByDomitsPropertyId("property-1");

    expect(builder.where).toHaveBeenCalledWith("p.domitsPropertyId = :d", { d: "property-1" });
    expect(builder.andWhere).toHaveBeenCalledWith("p.status = :s", { s: "ACTIVE" });
    expect(rows).toEqual([{ id: "mapping-1" }]);
  });
});
