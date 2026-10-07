import { outboxTimeBudgetMs } from "../../.shared/channelManagement/utils/channexAriOutboxPlanning.js";

describe("outboxTimeBudgetMs", () => {
  test("keeps 20 seconds in reserve to finish the property that is running", () => {
    expect(outboxTimeBudgetMs(60_000)).toBe(40_000);
  });

  test("never plans more than 45 seconds", () => {
    expect(outboxTimeBudgetMs(900_000)).toBe(45_000);
  });

  test("on a Lambda with a 10 second timeout it starts nothing, instead of being killed mid-send", () => {
    expect(outboxTimeBudgetMs(10_000)).toBe(0);
  });

  test("falls back to 45 seconds when the remaining time is unknown", () => {
    expect(outboxTimeBudgetMs(undefined)).toBe(45_000);
  });
});
