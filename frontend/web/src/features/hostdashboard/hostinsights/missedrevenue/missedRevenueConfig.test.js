import { buildMissedRevenueMetricCards } from "./missedRevenueConfig";
import { EMPTY_MISSED_REVENUE } from "./missedRevenueFields";

describe("buildMissedRevenueMetricCards", () => {
  test("formats actual revenue, potential revenue, and gross missed revenue as EUR", () => {
    const cards = buildMissedRevenueMetricCards({
      ...EMPTY_MISSED_REVENUE,
      actualRevenue: 1234.5,
      potentialRevenue: 2000,
      grossMissedRevenue: 765.5,
    });

    const byId = Object.fromEntries(cards.map((card) => [card.id, card]));

    expect(byId["actual-revenue"].value).toBe("EUR 1234.50");
    expect(byId["potential-revenue"].value).toBe("EUR 2000.00");
    expect(byId["gross-missed-revenue"].value).toBe("EUR 765.50");
  });

  test("formats revenue efficiency as a percentage", () => {
    const cards = buildMissedRevenueMetricCards({
      ...EMPTY_MISSED_REVENUE,
      potentialRevenue: 2000,
      revenueEfficiencyPct: 62.345,
    });

    const byId = Object.fromEntries(cards.map((card) => [card.id, card]));

    expect(byId["revenue-efficiency"].value).toBe("62.3%");
  });

  test("shows a dash for revenue efficiency when there is no potential revenue, even if the host earned money", () => {
    const cards = buildMissedRevenueMetricCards({
      ...EMPTY_MISSED_REVENUE,
      actualRevenue: 500,
      potentialRevenue: 0,
      revenueEfficiencyPct: 0,
    });

    const byId = Object.fromEntries(cards.map((card) => [card.id, card]));

    expect(byId["revenue-efficiency"].value).toBe("–");
    expect(byId["actual-revenue"].value).toBe("EUR 500.00");
  });

  test("shows a fallback value for a non-finite metric instead of throwing", () => {
    const cards = buildMissedRevenueMetricCards({ ...EMPTY_MISSED_REVENUE, actualRevenue: NaN });

    const byId = Object.fromEntries(cards.map((card) => [card.id, card]));

    expect(byId["actual-revenue"].value).toBe("No data yet");
  });

  test("produces exactly one card per defined metric, each with a title", () => {
    const cards = buildMissedRevenueMetricCards(EMPTY_MISSED_REVENUE);

    expect(cards).toHaveLength(4);
    cards.forEach((card) => {
      expect(typeof card.title).toBe("string");
      expect(card.title.length).toBeGreaterThan(0);
    });
  });
});

describe("buildMissedRevenueMetricCards change line", () => {
  const withPercentChange = (percentChange) => ({
    ...EMPTY_MISSED_REVENUE,
    comparison: {
      previousPeriod: {},
      delta: {},
      percentChange: { grossMissedRevenue: 0, actualRevenue: 0, potentialRevenue: 0, ...percentChange },
    },
  });

  const cardsById = (missedRevenue) =>
    Object.fromEntries(buildMissedRevenueMetricCards(missedRevenue).map((card) => [card.id, card]));

  test("shows an increase with a plus sign and a decrease with a minus sign, to one decimal", () => {
    const byId = cardsById(withPercentChange({ grossMissedRevenue: 12.345, actualRevenue: -8 }));

    expect(byId["gross-missed-revenue"].change).toBe("+12.3% vs previous period");
    expect(byId["actual-revenue"].change).toBe("-8.0% vs previous period");
  });

  test("says there is no change when the percent change is zero", () => {
    const byId = cardsById(withPercentChange({ potentialRevenue: 0 }));

    expect(byId["potential-revenue"].change).toBe("No change vs previous period");
  });

  test("says there is no baseline, not 0%, when the previous period was zero", () => {
    const byId = cardsById(withPercentChange({ grossMissedRevenue: null }));

    expect(byId["gross-missed-revenue"].change).toBe("No previous-period baseline");
  });

  test("shows no change line when the response has no comparison", () => {
    const byId = cardsById(EMPTY_MISSED_REVENUE);

    expect(byId["gross-missed-revenue"].change).toBeNull();
  });

  test("never shows a change line on the revenue efficiency card", () => {
    const byId = cardsById(withPercentChange({ grossMissedRevenue: 5 }));

    expect(byId["revenue-efficiency"].change).toBeNull();
  });
});
