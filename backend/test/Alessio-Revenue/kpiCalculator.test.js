// KPI Calculator – Unit Tests

import { KpiCalculator } from "../../functions/Alessio-Revenue/business/service/kpiCalculator.js";

describe("KpiCalculator", () => {
  test("calculateADR returns revenue / bookedNights", () => {
    expect(KpiCalculator.calculateADR(1000, 10)).toBe(100);
  });

  test("calculateADR returns 0 when bookedNights is 0", () => {
    expect(KpiCalculator.calculateADR(1000, 0)).toBe(0);
  });

  test("calculateOccupancyRate returns booked/available * 100", () => {
    expect(KpiCalculator.calculateOccupancyRate(5, 10)).toBe(50);
  });

  test("calculateOccupancyRate returns 0 when availableNights is 0", () => {
    expect(KpiCalculator.calculateOccupancyRate(5, 0)).toBe(0);
  });

  test("calculateRevPAR returns correct value", () => {
    expect(KpiCalculator.calculateRevPAR(1000, 10, 20)).toBe(50);
  });

  test("handles null/undefined safely", () => {
    expect(KpiCalculator.calculateADR(undefined, null)).toBe(0);
    expect(KpiCalculator.calculateOccupancyRate(undefined, null)).toBe(0);
    expect(KpiCalculator.calculateRevPAR(undefined, null, undefined)).toBe(0);
  });
});