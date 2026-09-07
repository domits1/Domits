import { UnifiedThread } from "./UnifiedThread.js";

describe("UnifiedThread entity column mapping", () => {
  test("maps the bookingId property to the bookingid database column", () => {
    expect(UnifiedThread.options.columns.bookingId.name).toBe("bookingid");
  });
});
