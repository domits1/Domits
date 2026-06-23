jest.mock("../.shared/integrations/ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const Database = require("../.shared/integrations/ORM/index.js").default;
const OutboxRepository = require("../data/outboxRepository.js").default;

const chain = (terminalName, terminalValue) => {
  const builder = {};
  ["where", "andWhere", "orderBy", "limit", "update", "set"].forEach((method) => {
    builder[method] = jest.fn(() => builder);
  });
  builder[terminalName] = jest.fn(async () => terminalValue);
  return builder;
};

describe("OutboxRepository stale claims", () => {
  test("makes stale PROCESSING events processable and claimable again", async () => {
    const readBuilder = chain("getMany", []);
    const claimBuilder = chain("execute", { affected: 1 });
    Database.getInstance.mockResolvedValue({
      getRepository: jest.fn(() => ({ createQueryBuilder: jest.fn(() => readBuilder) })),
      createQueryBuilder: jest.fn(() => claimBuilder),
    });
    const repository = new OutboxRepository();
    const now = 1_800_000;
    const staleMs = 300_000;

    await repository.listProcessable(25, 3, now, staleMs);
    await expect(repository.claim("event-1", now, staleMs)).resolves.toBe(true);

    expect(readBuilder.where).toHaveBeenCalledWith(expect.stringContaining("event.status = :processing"), {
      statuses: ["PENDING", "FAILED"],
      processing: "PROCESSING",
      staleBefore: now - staleMs,
    });
    expect(claimBuilder.set).toHaveBeenCalledWith(expect.objectContaining({
      status: "PROCESSING",
      updatedAt: now,
    }));
    expect(claimBuilder.andWhere).toHaveBeenCalledWith(expect.stringContaining("status = :processing"), {
      statuses: ["PENDING", "FAILED"],
      processing: "PROCESSING",
      staleBefore: now - staleMs,
    });
  });
});
