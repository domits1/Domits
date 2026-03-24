import { jest } from "@jest/globals";
import { Repository } from "../../functions/Alessio-Revenue/data/repository.js";
import Database from "database";

jest.mock("database", () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(),
  },
}));

describe("Repository.createKpiSnapshot", () => {
  it("slaat snapshot op met juiste mapping", async () => {
    const saveMock = jest.fn().mockResolvedValue({ id: "ok" });
    const getRepositoryMock = jest.fn().mockReturnValue({ save: saveMock });

    Database.getInstance.mockResolvedValue({
      getRepository: getRepositoryMock,
    });

    const repo = new Repository();

    const result = await repo.createKpiSnapshot({
      userId: "user-1",
      hostId: "host-1",
      periodType: "weekly",
      periodStart: new Date("2026-03-01T00:00:00Z"),
      periodEnd: new Date("2026-03-07T23:59:59Z"),
      metrics: {
        revenue: 1000,
        bookedNights: 10,
        availableNights: 20,
        propertyCount: 3,
        alos: 2.5,
        adr: 100,
        occupancyRate: 50,
        revpar: 50,
      },
    });

    expect(getRepositoryMock).toHaveBeenCalled(); // entity check is genoeg
    expect(saveMock).toHaveBeenCalledWith({
      user_id: "user-1",
      host_id: "host-1",
      period_type: "weekly",
      period_start: new Date("2026-03-01T00:00:00Z"),
      period_end: new Date("2026-03-07T23:59:59Z"),

      revenue: 1000,
      booked_nights: 10,
      available_nights: 20,
      property_count: 3,
      alos: 2.5,
      adr: 100,
      occupancy_rate: 50,
      revpar: 50,
    });

    expect(result).toEqual({ id: "ok" });
  });
});