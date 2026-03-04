import { jest } from "@jest/globals";

// ✅ mock Stripe BEFORE importing Service
jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => ({}));
});

import { Service } from "../../functions/Alessio-Revenue/business/service/service.js";

describe("Service.getAllKpis snapshot creation", () => {
  it("roept repository.createKpiSnapshot aan", async () => {
    const service = new Service();

    // mock repository
    service.repository = {
      createKpiSnapshot: jest.fn().mockResolvedValue({}),
    };

    // mock auth
    service.authManager = {
      authenticateUser: jest.fn().mockResolvedValue({ sub: "user-1" }),
    };

    // mock KPI base data
    service._fetchKpiBaseData = jest.fn().mockResolvedValue({
      raw: {
        totalRevenue: { totalRevenue: 1000 },
        bookedNights: { bookedNights: 10 },
        availableNights: { availableNights: 20 },
        propertyCount: { propertyCount: 3 },
        averageLengthOfStay: { averageLengthOfStay: 2.5 },
      },
      calc: {
        averageDailyRate: 100,
        occupancyRate: 50,
        revenuePerAvailableRoom: 50,
      },
    });

    const event = {
      headers: { Authorization: "token" },
      requestContext: { requestId: "req-1" },
      queryStringParameters: {
        filterType: "weekly",
      },
    };

    await service.getAllKpis(event);

    expect(service.repository.createKpiSnapshot).toHaveBeenCalledTimes(1);
  });
});