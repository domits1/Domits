import { jest } from "@jest/globals";

import {
  getActivePropertyCount,
  getEnterpriseBillingDetails,
} from "../../functions/Alessio-Revenue/activePropertyCalculator.js";

import Database from "database";
import { Property } from "database/models/Property";
import { EnterpriseRatePlan } from "database/models/EnterpriseRatePlan";

jest.mock("database", () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(),
  },
}));

describe("Enterprise Active Property Calculator", () => {
  const mockPropertyRepository = {
    count: jest.fn(),
    findOne: jest.fn(),
  };

  const mockRatePlanRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockQueryBuilder = {
    where: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    getOne: jest.fn(),
  };

  const mockDataSource = {
    getRepository: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockPropertyRepository.findOne.mockResolvedValue({
      enterpriseid: "ent_123",
      hostid: "host_123",
    });

    mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.andWhere.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.orderBy.mockReturnValue(mockQueryBuilder);

    mockRatePlanRepository.createQueryBuilder.mockReturnValue(
      mockQueryBuilder
    );

    Database.getInstance.mockResolvedValue(mockDataSource);

    mockDataSource.getRepository.mockImplementation((entity) => {
      if (entity === Property) {
        return mockPropertyRepository;
      }

      if (entity === EnterpriseRatePlan) {
        return mockRatePlanRepository;
      }

      throw new Error("Unexpected repository requested");
    });
  });

  test("counts active properties for an enterprise", async () => {
    mockPropertyRepository.count.mockResolvedValue(10);

    const count = await getActivePropertyCount("ent_123");

    expect(mockPropertyRepository.count).toHaveBeenCalledWith({
      where: {
        enterpriseid: "ent_123",
        status: "ACTIVE",
        is_deleted: false,
      },
    });

    expect(count).toBe(10);
  });

  test("calculates cost using the active rate plan", async () => {
    mockPropertyRepository.count.mockResolvedValue(50);

    mockQueryBuilder.getOne.mockResolvedValue({
      price_per_property_cents: 3900,
      currency: "EUR",
    });

    const result = await getEnterpriseBillingDetails(
      "ent_discount",
      "host_123"
    );

    expect(mockQueryBuilder.where).toHaveBeenCalledWith(
      "ratePlan.enterprise_id = :enterpriseId",
      {
        enterpriseId: "ent_discount",
      }
    );

    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      "ratePlan.status = :status",
      {
        status: "ACTIVE",
      }
    );

    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      "ratePlan.effective_from <= CURRENT_TIMESTAMP"
    );

    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      "(ratePlan.effective_until IS NULL OR ratePlan.effective_until >= CURRENT_TIMESTAMP)"
    );

    expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
      "ratePlan.effective_from",
      "DESC"
    );

    expect(result).toEqual({
      activeProperties: 50,
      pricePerProperty: 39,
      currency: "EUR",
      estimatedMonthlyCost: 1950,
    });
  });

  test("falls back to the default EUR rate when no plan exists", async () => {
    mockPropertyRepository.count.mockResolvedValue(5);
    mockQueryBuilder.getOne.mockResolvedValue(null);

    const result = await getEnterpriseBillingDetails(
      "ent_standard",
      "host_123"
    );

    expect(result).toEqual({
      activeProperties: 5,
      pricePerProperty: 49,
      currency: "EUR",
      estimatedMonthlyCost: 245,
    });
  });

  test("uses the latest effective rate plan", async () => {
    mockPropertyRepository.count.mockResolvedValue(100);

    mockQueryBuilder.getOne.mockResolvedValue({
      price_per_property_cents: 4900,
      currency: "EUR",
    });

    await getEnterpriseBillingDetails("ent_123", "host_123");

    expect(mockRatePlanRepository.createQueryBuilder).toHaveBeenCalledWith(
      "ratePlan"
    );

    expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
      "ratePlan.effective_from",
      "DESC"
    );

    expect(mockQueryBuilder.getOne).toHaveBeenCalled();
  });

  test("rejects a host without access to the enterprise", async () => {
    mockPropertyRepository.findOne.mockResolvedValue(null);

    await expect(
      getEnterpriseBillingDetails("ent_other", "host_123")
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "You do not have access to this enterprise.",
    });

    expect(mockPropertyRepository.findOne).toHaveBeenCalledWith({
      where: {
        enterpriseid: "ent_other",
        hostid: "host_123",
      },
    });

    expect(mockRatePlanRepository.createQueryBuilder).not.toHaveBeenCalled();
  });
});