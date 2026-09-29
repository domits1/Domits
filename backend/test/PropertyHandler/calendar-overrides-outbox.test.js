import { describe, expect, it, jest } from "@jest/globals";

const mockTransactionManager = { query: jest.fn().mockResolvedValue([]) };
const mockClient = {
  options: { schema: "main" },
  transaction: jest.fn(async (work) => work(mockTransactionManager)),
};

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn(async () => mockClient) },
}));

const { PropertyCalendarOverrideRepository } = require("../../functions/PropertyHandler/data/repository/propertyCalendarOverrideRepository.js");

const channexChange = {
  domitsPropertyId: "property-1",
  changeTypes: ["availability"],
  dateFrom: "2026-10-05",
  dateTo: "2026-10-05",
  source: "CALENDAR",
};

const buildRepository = () => {
  const channexAriOutboxWriter = { enqueueChannexAriChange: jest.fn().mockResolvedValue(true) };
  const repository = new PropertyCalendarOverrideRepository(null, { channexAriOutboxWriter });
  repository.getOverridesByPropertyId = jest.fn().mockResolvedValue([]);
  return { repository, channexAriOutboxWriter };
};

describe("PropertyCalendarOverrideRepository outbox row", () => {
  beforeEach(() => jest.clearAllMocks());

  it("writes the Channex outbox row in the same transaction as the overrides", async () => {
    const { repository, channexAriOutboxWriter } = buildRepository();

    await repository.upsertOverridesByPropertyId("property-1", [{ date: 20261005, isAvailable: false }], {}, channexChange);

    expect(mockTransactionManager.query).toHaveBeenCalled();
    expect(channexAriOutboxWriter.enqueueChannexAriChange).toHaveBeenCalledWith(mockTransactionManager, channexChange);
  });

  it("writes no outbox row when the save changes nothing Channex cares about", async () => {
    const { repository, channexAriOutboxWriter } = buildRepository();

    await repository.upsertOverridesByPropertyId("property-1", [{ date: 20261005, priceLabsIgnored: true }], {}, null);

    expect(channexAriOutboxWriter.enqueueChannexAriChange).not.toHaveBeenCalled();
  });

  it("runs the whole save again when DSQL reports a commit conflict", async () => {
    const { repository } = buildRepository();
    mockClient.transaction
      .mockRejectedValueOnce(Object.assign(new Error("conflict"), { code: "40001" }))
      .mockImplementationOnce(async (work) => work(mockTransactionManager));

    await repository.upsertOverridesByPropertyId("property-1", [{ date: 20261005, isAvailable: false }], {}, channexChange);

    expect(mockClient.transaction).toHaveBeenCalledTimes(2);
  });
});
