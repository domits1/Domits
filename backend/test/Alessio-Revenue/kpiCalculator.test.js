import { KpiCalculator } from "../../functions/Alessio-Revenue/business/service/kpiCalculator.js";

describe("KpiCalculator", () => {
  test("calculateADR returns revenue / bookedNights", () => {
    const adr = KpiCalculator.calculateADR(1000, 10);
    expect(adr).toBe(100);
  });

  test("calculateADR returns 0 when bookedNights is 0", () => {
    const adr = KpiCalculator.calculateADR(1000, 0);
    expect(adr).toBe(0);
  });

  test("calculateOccupancyRate returns booked/available * 100", () => {
    const occ = KpiCalculator.calculateOccupancyRate(5, 10);
    expect(occ).toBe(50);
  });

  test("calculateOccupancyRate returns 0 when availableNights is 0", () => {
    const occ = KpiCalculator.calculateOccupancyRate(5, 0);
    expect(occ).toBe(0);
  });

  test("calculateRevPAR returns ADR * (occupancyRate/100)", () => {
    // revenue=1000, booked=10 => ADR=100
    // available=20 => occupancy = 50%
    // revpar = 100 * 0.5 = 50
    const revpar = KpiCalculator.calculateRevPAR(1000, 10, 20);
    expect(revpar).toBe(50);
  });

  test("handles null/undefined safely", () => {
    const adr = KpiCalculator.calculateADR(undefined, null);
    const occ = KpiCalculator.calculateOccupancyRate(undefined, null);
    const revpar = KpiCalculator.calculateRevPAR(undefined, null, undefined);

    expect(adr).toBe(0);
    expect(occ).toBe(0);
    expect(revpar).toBe(0);
  });
});