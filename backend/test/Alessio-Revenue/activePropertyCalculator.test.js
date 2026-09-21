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
  };

  const mockRatePlanRepository = {
    findOne: jest.fn(),
  };

  const mockDataSource = {
    getRepository: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

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

    mockRatePlanRepository.findOne.mockResolvedValue({
      price_per_property: "39.00",
      currency: "EUR",
    });

    const result =
      await getEnterpriseBillingDetails("ent_discount");

    expect(mockRatePlanRepository.findOne).toHaveBeenCalledWith({
      where: {
        enterprise_id: "ent_discount",
        status: "active",
      },
      order: {
        effective_from: "DESC",
      },
    });

    expect(result).toEqual({
      activeProperties: 50,
      pricePerProperty: 39,
      currency: "EUR",
      estimatedMonthlyCost: 1950,
    });
  });

  test("falls back to the default EUR rate when no plan exists", async () => {
    mockPropertyRepository.count.mockResolvedValue(5);
    mockRatePlanRepository.findOne.mockResolvedValue(null);

    const result =
      await getEnterpriseBillingDetails("ent_standard");

    expect(result).toEqual({
      activeProperties: 5,
      pricePerProperty: 49,
      currency: "EUR",
      estimatedMonthlyCost: 245,
    });
  });

  test("uses the latest effective rate plan", async () => {
    mockPropertyRepository.count.mockResolvedValue(100);

    mockRatePlanRepository.findOne.mockResolvedValue({
      price_per_property: "49.00",
      currency: "EUR",
    });

    await getEnterpriseBillingDetails("ent_123");

    expect(mockRatePlanRepository.findOne).toHaveBeenCalledWith({
      where: {
        enterprise_id: "ent_123",
        status: "active",
      },
      order: {
        effective_from: "DESC",
      },
    });
  });
});