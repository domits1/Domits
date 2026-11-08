import {
  formatPropertyLocation,
  formatSubmittedAt,
  getGuestInitials,
  getVerificationLabel,
  matchesReviewSearch,
} from "../utils/reviewApprovalFormat";

const review = {
  title: "Great stay!",
  public_review: "Clean and modern",
  property_title: "Riverside Apartment",
  property_city: "Amsterdam",
  property_country: "Netherlands",
  guest_name: "Jessica Smith",
  booking_id: "DOM00123",
};

describe("review approval formatting", () => {
  test.each([
    ["Jessica Smith", "JS"],
    ["  michael  k. ", "MK"],
    ["Cher", "C"],
    ["Anna Maria van Dijk", "AD"],
    [null, "?"],
    ["   ", "?"],
  ])("uses the first and last initial of %p", (name, initials) => {
    expect(getGuestInitials(name)).toBe(initials);
  });

  test("joins the known parts of a property location", () => {
    expect(formatPropertyLocation(review)).toBe("Amsterdam, Netherlands");
    expect(formatPropertyLocation({ property_city: "Rotterdam", property_country: null })).toBe("Rotterdam");
    expect(formatPropertyLocation({})).toBe("");
  });

  test("splits a submission timestamp into a date and a time, accepting numeric strings", () => {
    const timestamp = new Date(2026, 6, 21, 10, 24).getTime();

    expect(formatSubmittedAt(timestamp)).toEqual({ date: "21 Jul 2026", time: "10:24" });
    expect(formatSubmittedAt(String(timestamp))).toEqual({ date: "21 Jul 2026", time: "10:24" });
    expect(formatSubmittedAt(undefined)).toEqual({ date: "Unknown date", time: "" });
  });

  test.each([
    ["VERIFIED", "Verified"],
    ["VERIFIED_STAY", "Verified stay"],
    ["UNVERIFIED", "Unverified"],
    ["SOMETHING_NEW", "Unverified"],
  ])("labels verification status %s", (status, label) => {
    expect(getVerificationLabel(status)).toBe(label);
  });

  test.each(["jessica", "RIVERSIDE", "dom00123", "great stay", "amsterdam"])(
    "matches %p against guest, property, booking, title and location",
    (query) => {
      expect(matchesReviewSearch(review, query)).toBe(true);
    }
  );

  test("matches everything on an empty query and nothing on an unrelated one", () => {
    expect(matchesReviewSearch(review, "   ")).toBe(true);
    expect(matchesReviewSearch(review, "rotterdam")).toBe(false);
    expect(matchesReviewSearch({ ...review, guest_name: null, property_title: null }, "jessica")).toBe(false);
  });
});
