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
    const cards = buildMissedRevenueMetricCards({ ...EMPTY_MISSED_REVENUE, revenueEfficiencyPct: 62.345 });

    const byId = Object.fromEntries(cards.map((card) => [card.id, card]));

    expect(byId["revenue-efficiency"].value).toBe("62.3%");
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
