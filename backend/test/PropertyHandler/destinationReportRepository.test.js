import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import Database from "database";
import { DestinationReportRepository } from "../../functions/PropertyHandler/data/repository/destinationReportRepository.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const SCHEMA = process.env.TEST === "true" ? "test" : "main";

describe("the destination report repository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("counts only active properties, grouped by the raw country and city text, and keeps those without a location", async () => {
    const query = jest.fn(async () => [
      { country: "Spain", city: "Marbella", has_location: true, active_count: "2" },
      { country: null, city: null, has_location: false, active_count: "1" },
    ]);
    Database.getInstance.mockResolvedValue({ options: { schema: "main" }, query });

    const rows = await new DestinationReportRepository().listActiveLocationCounts();

    expect(rows).toEqual([
      { country: "Spain", city: "Marbella", has_location: true, active_count: 2 },
      { country: "", city: "", has_location: false, active_count: 1 },
    ]);
    const [statement, parameters] = query.mock.calls[0];
    expect(statement).toContain(`FROM ${SCHEMA}.property p`);
    expect(statement).toContain(`LEFT JOIN ${SCHEMA}.property_location l ON l.property_id = p.id`);
    expect(statement).toContain("(l.property_id IS NOT NULL) AS has_location");
    expect(statement).toContain("WHERE p.status = $1");
    expect(statement).toContain("GROUP BY l.country, l.city");
    expect(statement).not.toMatch(/street|postal|house|latitude|longitude|hostid/i);
    expect(parameters).toEqual(["ACTIVE"]);
  });

  it("answers an empty list when the database returns nothing usable, and lets a failure reach the caller", async () => {
    Database.getInstance.mockResolvedValue({ options: { schema: "main" }, query: jest.fn(async () => null) });
    expect(await new DestinationReportRepository().listActiveLocationCounts()).toEqual([]);

    Database.getInstance.mockResolvedValue({
      options: { schema: "main" },
      query: jest.fn(async () => {
        throw new Error("connection refused");
      }),
    });
    await expect(new DestinationReportRepository().listActiveLocationCounts()).rejects.toThrow("connection refused");
  });
});
