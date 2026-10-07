jest.mock("../../.shared/integrations/ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

import Database from "../../.shared/integrations/ORM/index.js";
import IntegrationPropertyRepository from "../../.shared/integrations/repositories/integrationPropertyRepository.js";

const buildQuery = (foundRow) => {
  const builder = {
    innerJoin: jest.fn(() => builder),
    where: jest.fn(() => builder),
    andWhere: jest.fn(() => builder),
    orderBy: jest.fn(() => builder),
    getOne: jest.fn(async () => foundRow),
  };
  Database.getInstance.mockResolvedValue({
    getRepository: () => ({ createQueryBuilder: () => builder }),
  });
  return builder;
};

describe("IntegrationPropertyRepository.findActiveChannexMappingByExternalPropertyId", () => {
  // Channex only sends its own property id, and an old INACTIVE mapping can share it after a re-map,
  // so the lookup must apply the same "mapped to Channex" rule as the ARI outbox.
  test("asks for the ACTIVE mapping of a Channex account for this Channex property", async () => {
    const builder = buildQuery({ id: "mapping-1" });

    const row = await new IntegrationPropertyRepository().findActiveChannexMappingByExternalPropertyId("channex-1");

    expect(builder.innerJoin).toHaveBeenCalledWith(expect.anything(), "a", "a.id = p.integrationAccountId");
    expect(builder.where).toHaveBeenCalledWith("p.externalPropertyId = :e", { e: "channex-1" });
    expect(builder.andWhere).toHaveBeenCalledWith("UPPER(p.status) = :s", { s: "ACTIVE" });
    expect(builder.andWhere).toHaveBeenCalledWith("UPPER(a.channel) = :c", { c: "CHANNEX" });
    expect(row).toEqual({ id: "mapping-1" });
  });

  test("prefers the most recently updated mapping when several match", async () => {
    const builder = buildQuery({ id: "mapping-1" });

    await new IntegrationPropertyRepository().findActiveChannexMappingByExternalPropertyId("channex-1");

    expect(builder.orderBy).toHaveBeenCalledWith("p.updatedAt", "DESC");
  });

  test("returns null when no ACTIVE Channex mapping exists", async () => {
    buildQuery(undefined);

    const row = await new IntegrationPropertyRepository().findActiveChannexMappingByExternalPropertyId("unknown");

    expect(row).toBeNull();
  });
});
