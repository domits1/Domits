import { describe, expect, it, jest } from "@jest/globals";

const mockTransactionManager = {
  query: jest.fn().mockResolvedValue([]),
  getRepository: jest.fn(() => ({
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    })),
  })),
};
const mockClient = {
  options: { schema: "main" },
  query: jest.fn().mockResolvedValue([]),
  transaction: jest.fn(async (work) => work(mockTransactionManager)),
};

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn(async () => mockClient) },
}));

const { PropertyPricingRepository } = require("../../functions/PropertyHandler/data/repository/propertyPricingRepository.js");
const {
  PropertyAvailabilityRestrictionRepository,
} = require("../../functions/PropertyHandler/data/repository/propertyAvailabilityRestrictionRepository.js");

const buildWriter = () => ({ enqueueChannexAriChange: jest.fn().mockResolvedValue(true) });

describe("global settings outbox rows", () => {
  beforeEach(() => jest.clearAllMocks());

  it("updates the pricing and writes a rates row in one transaction", async () => {
    const writer = buildWriter();
    const repository = new PropertyPricingRepository(null, { channexAriOutboxWriter: writer });
    repository.supportsWeekendRateColumn = jest.fn().mockResolvedValue(true);
    repository.getPricingById = jest.fn().mockResolvedValue({ roomRate: 100, cleaning: 10, weekendRate: 100 });

    await repository.upsertPricingByPropertyId("property-1", { roomRate: 120 });

    expect(mockTransactionManager.query).toHaveBeenCalledWith(expect.stringContaining("UPDATE"), expect.any(Array));
    expect(mockClient.query).not.toHaveBeenCalled();
    expect(writer.enqueueChannexAriChange).toHaveBeenCalledWith(
      mockTransactionManager,
      expect.objectContaining({ domitsPropertyId: "property-1", changeTypes: ["rates"], source: "GLOBAL_SETTINGS" })
    );
  });

  it("writes a restrictions row inside the existing restrictions transaction", async () => {
    const writer = buildWriter();
    const repository = new PropertyAvailabilityRestrictionRepository(null, { channexAriOutboxWriter: writer });

    await repository.replaceRestrictionsByPropertyId("property-1", []);

    expect(writer.enqueueChannexAriChange).toHaveBeenCalledWith(
      mockTransactionManager,
      expect.objectContaining({ domitsPropertyId: "property-1", changeTypes: ["restrictions"], source: "GLOBAL_SETTINGS" })
    );
  });

  it("covers today and the next 499 days, like the old direct call", async () => {
    const writer = buildWriter();
    const repository = new PropertyAvailabilityRestrictionRepository(null, { channexAriOutboxWriter: writer });

    await repository.replaceRestrictionsByPropertyId("property-1", []);

    const [, change] = writer.enqueueChannexAriChange.mock.calls[0];
    const days = (Date.parse(change.dateTo) - Date.parse(change.dateFrom)) / 86_400_000 + 1;
    expect(days).toBe(500);
  });
});
