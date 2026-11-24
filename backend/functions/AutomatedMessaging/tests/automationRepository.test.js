jest.mock("../.shared/integrations/ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const Database = require("../.shared/integrations/ORM/index.js").default;
const AutomationRepository = require("../data/automationRepository.js").default;

const chain = (terminalName, terminalValue) => {
  const builder = {};
  ["where", "andWhere", "orderBy"].forEach((method) => {
    builder[method] = jest.fn(() => builder);
  });
  builder[terminalName] = jest.fn(async () => terminalValue);
  return builder;
};

describe("AutomationRepository active automations for a booking", () => {
  test("returns active automations of every trigger type for the host and property scope", async () => {
    const builder = chain("getMany", [{ id: "automation-1" }]);
    Database.getInstance.mockResolvedValue({
      getRepository: jest.fn(() => ({ createQueryBuilder: jest.fn(() => builder) })),
    });
    const repository = new AutomationRepository();

    await expect(repository.listActiveForBooking("host-1", "property-1")).resolves.toEqual([{ id: "automation-1" }]);

    const conditions = [...builder.where.mock.calls, ...builder.andWhere.mock.calls].map(([sql]) => sql);
    expect(builder.where).toHaveBeenCalledWith("automation.hostId = :hostId", { hostId: "host-1" });
    expect(builder.andWhere).toHaveBeenCalledWith("automation.status = :status", { status: "ACTIVE" });
    expect(builder.andWhere).toHaveBeenCalledWith(
      "(automation.propertyId IS NULL OR automation.propertyId = :propertyId)",
      { propertyId: "property-1" }
    );
    expect(conditions.some((sql) => sql.includes("triggerType"))).toBe(false);
  });
});
