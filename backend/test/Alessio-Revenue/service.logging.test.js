import { Service } from "../../functions/Alessio-Revenue/business/service/service.js";

jest.mock("../../functions/Alessio-Revenue/business/service/paymentService.js", () => ({
  PaymentsService: jest.fn().mockImplementation(() => ({
    getTotalHostRevenue: jest.fn().mockResolvedValue({ totalRevenue: 1000 }),
  })),
}));

jest.mock("../../functions/Alessio-Revenue/data/repository.js", () => ({
  Repository: jest.fn().mockImplementation(() => ({
    getBookedNights: jest.fn().mockResolvedValue({ bookedNights: 10 }),
    getAvailableNights: jest.fn().mockResolvedValue({ availableNights: 20 }),
    getProperties: jest.fn().mockResolvedValue(1),
    getAverageLengthOfStay: jest.fn().mockResolvedValue(2),
    getBaseRate: jest.fn(),
  })),
}));

jest.mock("../../functions/Alessio-Revenue/auth/authManager.js", () => {
  return jest.fn().mockImplementation(() => ({
    authenticateUser: jest.fn().mockResolvedValue({ sub: "user-123" }),
  }));
});

jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => ({}));
});

describe("Service KPI metric resolution", () => {
  let service;

  beforeEach(() => {
    service = new Service();
  });

  test("returns the KPI metric when dependencies resolve", async () => {
    const event = {
      headers: { Authorization: "Bearer test" },
      queryStringParameters: { filterType: "weekly" },
    };

    await expect(service.getKpiMetric(event, "averageDailyRate"))
      .resolves.toBe("100.00");
  });
});