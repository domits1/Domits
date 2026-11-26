jest.mock("../.shared/integrations/ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const Database = require("../.shared/integrations/ORM/index.js").default;
const AutomationRepository = require("../data/automationRepository.js").default;
const { AUTOMATION_DELETED_REASON } = require("../data/automationRepository.js");

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

describe("AutomationRepository delete", () => {
  const writeBuilder = (affected) => {
    const builder = {};
    ["delete", "from", "update", "set", "where", "andWhere"].forEach((method) => {
      builder[method] = jest.fn(() => builder);
    });
    builder.execute = jest.fn(async () => ({ affected }));
    return builder;
  };

  const withTransaction = (deleteBuilder, cancelBuilder) => {
    const builders = [deleteBuilder, cancelBuilder];
    const manager = { createQueryBuilder: jest.fn(() => builders.shift()) };
    const client = { transaction: jest.fn(async (work) => work(manager)) };
    Database.getInstance.mockResolvedValue(client);
    return client;
  };

  test("deletes the host's automation and cancels its scheduled deliveries in one transaction", async () => {
    const deleteBuilder = writeBuilder(1);
    const cancelBuilder = writeBuilder(3);
    const client = withTransaction(deleteBuilder, cancelBuilder);

    await expect(new AutomationRepository().deleteForHost("automation-1", "host-1")).resolves.toBe(true);

    expect(client.transaction).toHaveBeenCalledTimes(1);
    expect(deleteBuilder.where).toHaveBeenCalledWith("id = :id", { id: "automation-1" });
    expect(deleteBuilder.andWhere).toHaveBeenCalledWith("hostId = :hostId", { hostId: "host-1" });
    expect(cancelBuilder.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "CANCELLED", failureReason: AUTOMATION_DELETED_REASON })
    );
    expect(cancelBuilder.where).toHaveBeenCalledWith("automationid = :id", { id: "automation-1" });
    expect(cancelBuilder.andWhere).toHaveBeenCalledWith("status = :scheduled", { scheduled: "SCHEDULED" });
  });

  test("changes no deliveries when the automation is not the host's", async () => {
    const deleteBuilder = writeBuilder(0);
    const cancelBuilder = writeBuilder(0);
    withTransaction(deleteBuilder, cancelBuilder);

    await expect(new AutomationRepository().deleteForHost("automation-1", "host-2")).resolves.toBe(false);

    expect(cancelBuilder.execute).not.toHaveBeenCalled();
  });
});
