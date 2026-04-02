// backend/functions/Alessio-Revenue/business/service/kpiCalculator.js

export class KpiCalculator {
  static toNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  static safeDivide(numerator, denominator) {
    const num = this.toNumber(numerator);
    const den = this.toNumber(denominator);
    if (den <= 0) return 0;
    return num / den;
  }

  static calculateADR(totalRevenue, bookedNights) {
    return this.safeDivide(totalRevenue, bookedNights);
  }

  static calculateOccupancyRate(bookedNights, availableNights) {
    return this.safeDivide(bookedNights, availableNights) * 100;
  }

  static calculateRevPAR(totalRevenue, bookedNights, availableNights) {
    const adr = this.calculateADR(totalRevenue, bookedNights);
    const occ = this.calculateOccupancyRate(bookedNights, availableNights);
    return adr * (occ / 100);
  }
}