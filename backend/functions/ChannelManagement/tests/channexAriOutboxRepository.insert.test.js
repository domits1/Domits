import ChannexAriOutboxRepository from "../../.shared/channelManagement/repositories/channexAriOutboxRepository.js";

const createManager = () => {
  const builder = {
    insert: jest.fn(() => builder),
    into: jest.fn(() => builder),
    values: jest.fn(() => builder),
    execute: jest.fn(async () => ({})),
  };
  return { manager: { createQueryBuilder: jest.fn(() => builder) }, builder };
};

const validInput = (overrides = {}) => ({
  domitsPropertyId: "property-1",
  kind: "CHANGE",
  changeTypes: ["availability"],
  dateFrom: 20261101,
  dateTo: 20261101,
  source: "CALENDAR",
  now: 1_750_000_000_000,
  ...overrides,
});

describe("ChannexAriOutboxRepository.insert", () => {
  test("writes one PENDING row through the caller's transaction", async () => {
    const { manager, builder } = createManager();

    const row = await new ChannexAriOutboxRepository().insert(
      manager,
      validInput({ changeTypes: ["availability", "rates"], dateTo: 20261105 })
    );

    expect(builder.values).toHaveBeenCalledWith(
      expect.objectContaining({
        domitsPropertyId: "property-1",
        kind: "CHANGE",
        changeTypes: "availability,rates",
        dateFrom: 20261101,
        dateTo: 20261105,
        source: "CALENDAR",
        status: "PENDING",
        attemptCount: 0,
        nextAttemptAt: null,
        processedAt: null,
        createdAt: 1_750_000_000_000,
        updatedAt: 1_750_000_000_000,
      })
    );
    expect(manager.createQueryBuilder).toHaveBeenCalledTimes(1);
    expect(row.id).toEqual(expect.any(String));
  });

  test.each([
    ["dateTo before dateFrom", { dateFrom: 20261105, dateTo: 20261101 }, "dateTo must not be before dateFrom"],
    ["an empty change type list", { changeTypes: [] }, "changeTypes must not be empty"],
    ["a timestamp instead of YYYYMMDD", { dateFrom: 1761955200000 }, "dateFrom must be an integer date"],
    ["a blank property id", { domitsPropertyId: "  " }, "domitsPropertyId is required"],
  ])("rejects %s and writes nothing", async (_name, overrides, message) => {
    const { manager, builder } = createManager();

    await expect(new ChannexAriOutboxRepository().insert(manager, validInput(overrides))).rejects.toThrow(message);
    expect(builder.execute).not.toHaveBeenCalled();
  });
});
