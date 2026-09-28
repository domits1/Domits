import { jest } from "@jest/globals";

import {
  getEnterpriseIdForHost,
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
  const createPropertyQueryBuilder = () => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getRawOne: jest.fn(),
    getCount: jest.fn(),
  });

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

    mockRatePlanQueryBuilder.where.mockReturnValue(mockRatePlanQueryBuilder);
    mockRatePlanQueryBuilder.andWhere.mockReturnValue(mockRatePlanQueryBuilder);
    mockRatePlanQueryBuilder.orderBy.mockReturnValue(mockRatePlanQueryBuilder);

    mockPropertyRepository.createQueryBuilder.mockReset();
    mockRatePlanRepository.createQueryBuilder.mockReturnValue(mockRatePlanQueryBuilder);
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

  test("resolves an enterprise id for a host", async () => {
    const queryBuilder = createPropertyQueryBuilder();
    queryBuilder.getRawOne.mockResolvedValue({ enterpriseId: "ent_123" });
    mockPropertyRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    await expect(getEnterpriseIdForHost("host_123")).resolves.toBe("ent_123");

    expect(queryBuilder.select).toHaveBeenCalledWith(
      "property.enterpriseid",
      "enterpriseId"
    );
    expect(queryBuilder.where).toHaveBeenCalledWith(
      "property.hostid = :hostId",
      { hostId: "host_123" }
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      "property.enterpriseid IS NOT NULL"
    );
  });

  test("returns null when a host has no enterprise id", async () => {
    const queryBuilder = createPropertyQueryBuilder();
    queryBuilder.getRawOne.mockResolvedValue(null);
    mockPropertyRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    await expect(getEnterpriseIdForHost("host_123")).resolves.toBeNull();
  });

  test("counts active properties for an enterprise", async () => {
    const queryBuilder = createPropertyQueryBuilder();
    queryBuilder.getCount.mockResolvedValue(10);
    mockPropertyRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    await expect(getActivePropertyCount("ent_123")).resolves.toBe(10);

    expect(queryBuilder.where).toHaveBeenCalledWith(
      "property.enterpriseid = :enterpriseId",
      { enterpriseId: "ent_123" }
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      "property.status = :status",
      { status: "ACTIVE" }
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      "property.is_deleted = :isDeleted",
      { isDeleted: false }
    );
  });

  test("calculates cost using the active rate plan", async () => {
    const authQueryBuilder = createPropertyQueryBuilder();
    authQueryBuilder.getOne.mockResolvedValue({ id: "property_123" });

    const countQueryBuilder = createPropertyQueryBuilder();
    countQueryBuilder.getCount.mockResolvedValue(50);

    mockPropertyRepository.createQueryBuilder
      .mockReturnValueOnce(authQueryBuilder)
      .mockReturnValueOnce(countQueryBuilder);

    mockRatePlanQueryBuilder.getOne.mockResolvedValue({
      price_per_property_cents: 3900,
      currency: "EUR",
    });

    const result = await getEnterpriseBillingDetails("ent_discount", "host_123");

    expect(authQueryBuilder.where).toHaveBeenCalledWith(
      "property.enterpriseid = :enterpriseId",
      { enterpriseId: "ent_discount" }
    );
    expect(authQueryBuilder.andWhere).toHaveBeenCalledWith(
      "property.hostid = :hostId",
      { hostId: "host_123" }
    );
    expect(mockRatePlanQueryBuilder.where).toHaveBeenCalledWith(
      "ratePlan.enterprise_id = :enterpriseId",
      { enterpriseId: "ent_discount" }
    );
    expect(result).toEqual({
      enterpriseId: "ent_discount",
      activeProperties: 50,
      pricePerProperty: 39,
      currency: "EUR",
      estimatedMonthlyCost: 1950,
    });
  });

  test("rejects an enterprise without an active rate plan", async () => {
    const authQueryBuilder = createPropertyQueryBuilder();
    authQueryBuilder.getOne.mockResolvedValue({ id: "property_123" });
    mockPropertyRepository.createQueryBuilder.mockReturnValue(authQueryBuilder);
    mockRatePlanQueryBuilder.getOne.mockResolvedValue(null);

    await expect(
      getEnterpriseBillingDetails("ent_standard", "host_123")
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "No active enterprise rate plan was found.",
    });

    expect(mockRatePlanQueryBuilder.getOne).toHaveBeenCalled();
  });

  test("uses the resolved enterprise for a host portfolio lookup", async () => {
    const resolveQueryBuilder = createPropertyQueryBuilder();
    resolveQueryBuilder.getRawOne.mockResolvedValue({ enterpriseId: "ent_123" });

    const authQueryBuilder = createPropertyQueryBuilder();
    authQueryBuilder.getOne.mockResolvedValue({ id: "property_123" });

    const countQueryBuilder = createPropertyQueryBuilder();
    countQueryBuilder.getCount.mockResolvedValue(3);

    mockPropertyRepository.createQueryBuilder
      .mockReturnValueOnce(resolveQueryBuilder)
      .mockReturnValueOnce(authQueryBuilder)
      .mockReturnValueOnce(countQueryBuilder);

    mockRatePlanQueryBuilder.getOne.mockResolvedValue({
      price_per_property_cents: 4900,
      currency: "EUR",
    });

    await expect(
      getEnterpriseBillingDetails("host_123", "host_123")
    ).resolves.toEqual({
      enterpriseId: "ent_123",
      activeProperties: 3,
      pricePerProperty: 49,
      currency: "EUR",
      estimatedMonthlyCost: 147,
    });

    expect(authQueryBuilder.where).toHaveBeenCalledWith(
      "property.enterpriseid = :enterpriseId",
      { enterpriseId: "ent_123" }
    );
    expect(countQueryBuilder.where).toHaveBeenCalledWith(
      "property.enterpriseid = :enterpriseId",
      { enterpriseId: "ent_123" }
    );
  });

  test("rejects a host without access to the enterprise", async () => {
    const authQueryBuilder = createPropertyQueryBuilder();
    authQueryBuilder.getOne.mockResolvedValue(null);
    mockPropertyRepository.createQueryBuilder.mockReturnValue(authQueryBuilder);

    await expect(
      getEnterpriseBillingDetails("ent_other", "host_123")
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "You do not have access to this enterprise.",
    });

    expect(mockRatePlanRepository.createQueryBuilder).not.toHaveBeenCalled();
  });

  test("rejects a host without an enterprise rate plan", async () => {
    const resolveQueryBuilder = createPropertyQueryBuilder();
    resolveQueryBuilder.getRawOne.mockResolvedValue(null);
    mockPropertyRepository.createQueryBuilder.mockReturnValue(resolveQueryBuilder);

    await expect(
      getEnterpriseBillingDetails("host_123", "host_123")
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "No active enterprise rate plan was found.",
    });

    expect(mockRatePlanRepository.createQueryBuilder).not.toHaveBeenCalled();
  });
});
