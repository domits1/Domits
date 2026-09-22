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
  const mockPropertyQueryBuilder = {
    where: jest.fn(),
    andWhere: jest.fn(),
    getOne: jest.fn(),
    getCount: jest.fn(),
  };

  const mockRatePlanQueryBuilder = {
    where: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    getOne: jest.fn(),
  };

  const mockPropertyRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockRatePlanRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockDataSource = {
    getRepository: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockPropertyQueryBuilder.where.mockReturnValue(
      mockPropertyQueryBuilder
    );
    mockPropertyQueryBuilder.andWhere.mockReturnValue(
      mockPropertyQueryBuilder
    );

    mockRatePlanQueryBuilder.where.mockReturnValue(
      mockRatePlanQueryBuilder
    );
    mockRatePlanQueryBuilder.andWhere.mockReturnValue(
      mockRatePlanQueryBuilder
    );
    mockRatePlanQueryBuilder.orderBy.mockReturnValue(
      mockRatePlanQueryBuilder
    );

    mockPropertyRepository.createQueryBuilder.mockReturnValue(
      mockPropertyQueryBuilder
    );

    mockRatePlanRepository.createQueryBuilder.mockReturnValue(
      mockRatePlanQueryBuilder
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
    mockPropertyQueryBuilder.getCount.mockResolvedValue(10);

    const count = await getActivePropertyCount("ent_123");

    expect(
      mockPropertyRepository.createQueryBuilder
    ).toHaveBeenCalledWith("property");

    expect(mockPropertyQueryBuilder.where).toHaveBeenCalledWith(
      "property.enterpriseid = :enterpriseId",
      {
        enterpriseId: "ent_123",
      }
    );

    expect(mockPropertyQueryBuilder.andWhere).toHaveBeenCalledWith(
      "property.status = :status",
      {
        status: "ACTIVE",
      }
    );

    expect(mockPropertyQueryBuilder.andWhere).toHaveBeenCalledWith(
      "property.is_deleted = :isDeleted",
      {
        isDeleted: false,
      }
    );

    expect(mockPropertyQueryBuilder.getCount).toHaveBeenCalled();

    expect(count).toBe(10);
  });

  test("calculates cost using the active rate plan", async () => {
    mockPropertyQueryBuilder.getOne.mockResolvedValue({
      id: "property_123",
      enterpriseid: "ent_discount",
      hostid: "host_123",
    });

    mockPropertyQueryBuilder.getCount.mockResolvedValue(50);

    mockRatePlanQueryBuilder.getOne.mockResolvedValue({
      price_per_property_cents: 3900,
      currency: "EUR",
    });

    const result = await getEnterpriseBillingDetails(
      "ent_discount",
      "host_123"
    );

    expect(
      mockPropertyRepository.createQueryBuilder
    ).toHaveBeenCalledWith("property");

    expect(mockPropertyQueryBuilder.where).toHaveBeenCalledWith(
      "property.enterpriseid = :enterpriseId",
      {
        enterpriseId: "ent_discount",
      }
    );

    expect(mockPropertyQueryBuilder.andWhere).toHaveBeenCalledWith(
      "property.hostid = :hostId",
      {
        hostId: "host_123",
      }
    );

    expect(mockPropertyQueryBuilder.getOne).toHaveBeenCalled();

    expect(
      mockRatePlanRepository.createQueryBuilder
    ).toHaveBeenCalledWith("ratePlan");

    expect(mockRatePlanQueryBuilder.where).toHaveBeenCalledWith(
      "ratePlan.enterprise_id = :enterpriseId",
      {
        enterpriseId: "ent_discount",
      }
    );

    expect(mockRatePlanQueryBuilder.andWhere).toHaveBeenCalledWith(
      "ratePlan.status = :status",
      {
        status: "ACTIVE",
      }
    );

    expect(mockRatePlanQueryBuilder.andWhere).toHaveBeenCalledWith(
      "ratePlan.effective_from <= CURRENT_TIMESTAMP"
    );

    expect(mockRatePlanQueryBuilder.andWhere).toHaveBeenCalledWith(
      "(ratePlan.effective_until IS NULL OR ratePlan.effective_until >= CURRENT_TIMESTAMP)"
    );

    expect(mockRatePlanQueryBuilder.orderBy).toHaveBeenCalledWith(
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
    mockPropertyQueryBuilder.getOne.mockResolvedValue({
      id: "property_123",
      enterpriseid: "ent_standard",
      hostid: "host_123",
    });

    mockPropertyQueryBuilder.getCount.mockResolvedValue(5);

    mockRatePlanQueryBuilder.getOne.mockResolvedValue(null);

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
    mockPropertyQueryBuilder.getOne.mockResolvedValue({
      id: "property_123",
      enterpriseid: "ent_123",
      hostid: "host_123",
    });

    mockPropertyQueryBuilder.getCount.mockResolvedValue(100);

    mockRatePlanQueryBuilder.getOne.mockResolvedValue({
      price_per_property_cents: 4900,
      currency: "EUR",
    });

    await getEnterpriseBillingDetails("ent_123", "host_123");

    expect(
      mockRatePlanRepository.createQueryBuilder
    ).toHaveBeenCalledWith("ratePlan");

    expect(mockRatePlanQueryBuilder.orderBy).toHaveBeenCalledWith(
      "ratePlan.effective_from",
      "DESC"
    );

    expect(mockRatePlanQueryBuilder.getOne).toHaveBeenCalled();
  });

  test("rejects a host without access to the enterprise", async () => {
    mockPropertyQueryBuilder.getOne.mockResolvedValue(null);

    await expect(
      getEnterpriseBillingDetails("ent_other", "host_123")
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "You do not have access to this enterprise.",
    });

    expect(mockPropertyQueryBuilder.where).toHaveBeenCalledWith(
      "property.enterpriseid = :enterpriseId",
      {
        enterpriseId: "ent_other",
      }
    );

    expect(mockPropertyQueryBuilder.andWhere).toHaveBeenCalledWith(
      "property.hostid = :hostId",
      {
        hostId: "host_123",
      }
    );

    expect(mockPropertyQueryBuilder.getOne).toHaveBeenCalled();

    expect(
      mockRatePlanRepository.createQueryBuilder
    ).not.toHaveBeenCalled();
  });
});