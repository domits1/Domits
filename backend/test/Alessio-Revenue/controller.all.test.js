// Controller Tests – KPI Endpoint Routing
// Tests metric=all and single metric behavior

const mockGetAllKpis = jest.fn();
const mockGetKpiMetric = jest.fn();

jest.mock("../../functions/Alessio-Revenue/business/service/service.js", () => {
  return {
    Service: jest.fn().mockImplementation(() => ({
      getAllKpis: mockGetAllKpis,
      getKpiMetric: mockGetKpiMetric,
    })),
  };
});

import Controller from "../../functions/Alessio-Revenue/controller/controller.js";

describe("Controller – KPI Routing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // metric=all > should return full KPI object

  test("returns 200 and calls getAllKpis when metric=all", async () => {
    const controller = new Controller();

    const fakeAllKpis = {
      averageDailyRate: "100.00",
      occupancyRate: "50.00",
    };

    mockGetAllKpis.mockResolvedValue(fakeAllKpis);

    const event = {
      queryStringParameters: { metric: "all", filterType: "weekly" },
      headers: { Authorization: "Bearer test" },
    };

    const response = await controller.getHostKpi(event);

    expect(response.statusCode).toBe(200);
    expect(mockGetAllKpis).toHaveBeenCalledTimes(1);
    expect(mockGetAllKpis).toHaveBeenCalledWith(event);
    expect(JSON.parse(response.body)).toEqual(fakeAllKpis);
  });

  // single metric > should call getKpiMetric

  test("returns 200 and calls getKpiMetric for single metric", async () => {
    const controller = new Controller();

    mockGetKpiMetric.mockResolvedValue("123.45");

    const event = {
      queryStringParameters: { metric: "averageDailyRate" },
      headers: { Authorization: "Bearer test" },
    };

    const response = await controller.getHostKpi(event);

    expect(response.statusCode).toBe(200);
    expect(mockGetKpiMetric).toHaveBeenCalledTimes(1);
    expect(mockGetKpiMetric).toHaveBeenCalledWith(event, "averageDailyRate");
    expect(JSON.parse(response.body)).toEqual({
      averageDailyRate: "123.45",
    });
  });
});