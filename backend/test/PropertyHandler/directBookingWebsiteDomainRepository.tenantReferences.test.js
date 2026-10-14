import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import Database from "database";
import { DirectBookingWebsiteDomainRepository } from "../../functions/PropertyHandler/data/repository/directBookingWebsiteDomainRepository.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const buildClient = (rows) => {
  const client = { options: { schema: "main" }, query: jest.fn().mockResolvedValue(rows) };
  Database.getInstance.mockResolvedValue(client);
  return client;
};

describe("DirectBookingWebsiteDomainRepository.countDomainsByTenantId", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("counts rows whose stored verification details name the tenant id exactly", async () => {
    const client = buildClient([{ domain_count: 2 }]);

    const count = await new DirectBookingWebsiteDomainRepository().countDomainsByTenantId(" dt_1 ");

    expect(count).toBe(2);
    const [statement, parameters] = client.query.mock.calls[0];
    expect(statement).toMatch(/SELECT COUNT\(\*\)::int AS domain_count/);
    expect(statement).toContain("POSITION($1 IN verification_details_json) > 0");
    expect(parameters).toEqual(['"tenantId":"dt_1"']);
  });

  it("answers zero when nothing references the tenant", async () => {
    buildClient([{ domain_count: 0 }]);

    await expect(new DirectBookingWebsiteDomainRepository().countDomainsByTenantId("dt_1")).resolves.toBe(0);
  });

  it("refuses an empty tenant id instead of matching every row", async () => {
    const client = buildClient([]);

    await expect(new DirectBookingWebsiteDomainRepository().countDomainsByTenantId("")).rejects.toThrow(TypeError);
    expect(client.query).not.toHaveBeenCalled();
  });
});
