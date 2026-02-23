import { Service } from "../../functions/Alessio-Revenue/business/service/service.js";

// Mock alle externe dependencies
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

describe("Service KPI logging", () => {
  let service;

  beforeEach(() => {
    service = new Service();
    jest.spyOn(console, "info").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("logs success when KPI is calculated", async () => {
    const event = {
      headers: { Authorization: "Bearer test" },
      queryStringParameters: { filterType: "weekly" },
    };

    await service.getKpiMetric(event, "averageDailyRate");

    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining("[RMS][KPI_REFRESH] success"),
      expect.objectContaining({
        kpiMetric: "averageDailyRate",
      })
    );
  });
});