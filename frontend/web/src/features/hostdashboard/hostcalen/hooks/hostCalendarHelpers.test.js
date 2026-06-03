import { isBookedStatus } from "./hostCalendarHelpers";

describe("host calendar booking status filters", () => {
  test.each([
    ["Paid", true],
    ["Awaiting Payment", true],
    ["Failed", false],
    ["Declined", false],
    ["Inquiry", false],
    ["Cancelled", false],
    ["Canceled", false],
  ])("treats %s booked status as %s", (status, expected) => {
    expect(isBookedStatus(status)).toBe(expected);
  });
});
