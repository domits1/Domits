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
  test("writes one PENDING row with the given range and change types", async () => {
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
    expect(row.id).toEqual(expect.any(String));
    expect(row.id.length).toBeGreaterThan(30);
  });

  test("uses the caller's transaction, so the row and the domain change commit together", async () => {
    const { manager, builder } = createManager();

    await new ChannexAriOutboxRepository().insert(manager, validInput());

    expect(manager.createQueryBuilder).toHaveBeenCalledTimes(1);
    expect(builder.execute).toHaveBeenCalledTimes(1);
  });

  test("rejects a range where dateTo is before dateFrom", async () => {
    const { manager } = createManager();

    await expect(
      new ChannexAriOutboxRepository().insert(manager, validInput({ dateFrom: 20261105, dateTo: 20261101 }))
    ).rejects.toThrow("dateTo must not be before dateFrom");
  });

  test("rejects an empty change type list, because the row would say nothing changed", async () => {
    const { manager } = createManager();

    await expect(
      new ChannexAriOutboxRepository().insert(manager, validInput({ changeTypes: [] }))
    ).rejects.toThrow("changeTypes must not be empty");
  });

  test("rejects a date that is not in YYYYMMDD form", async () => {
    const { manager } = createManager();

    await expect(
      new ChannexAriOutboxRepository().insert(manager, validInput({ dateFrom: 1761955200000 }))
    ).rejects.toThrow("dateFrom must be an integer date in YYYYMMDD form");
  });

  test("rejects a missing property id", async () => {
    const { manager } = createManager();

    await expect(
      new ChannexAriOutboxRepository().insert(manager, validInput({ domitsPropertyId: "  " }))
    ).rejects.toThrow("domitsPropertyId is required");
  });

  test("writes nothing when validation fails", async () => {
    const { manager, builder } = createManager();

    await expect(
      new ChannexAriOutboxRepository().insert(manager, validInput({ changeTypes: [] }))
    ).rejects.toThrow();
    expect(builder.execute).not.toHaveBeenCalled();
  });
});
