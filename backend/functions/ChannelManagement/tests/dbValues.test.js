import { toCount, toTimeOrNull } from "../../.shared/channelManagement/utils/dbValues.js";

describe("dbValues", () => {
  test("turns a count string from Postgres into a number, and a missing count into 0", () => {
    expect(toCount("3")).toBe(3);
    expect(toCount(null)).toBe(0);
    expect(toCount(undefined)).toBe(0);
  });

  test("turns a bigint time string into a number, and keeps a missing time as null", () => {
    expect(toTimeOrNull("1794307261992")).toBe(1794307261992);
    expect(toTimeOrNull(null)).toBeNull();
    expect(toTimeOrNull(undefined)).toBeNull();
  });
});
