import {
  getListingStatusLabel,
  getStatusChangeMessage,
  getListingStatusTone,
  isSubmittedForReview,
  normalizeListingStatus,
} from "./listingStatus";

describe("listingStatus", () => {
  it.each([
    ["ACTIVE", "Live", "live"],
    ["INACTIVE", "Drafted", "draft"],
    ["ARCHIVED", "Archived", "archived"],
    ["PENDING_REVIEW", "Pending review", "pending"],
    ["REJECTED", "Rejected", "rejected"],
  ])("maps %s to label %s and tone %s", (status, label, tone) => {
    expect(getListingStatusLabel(status)).toBe(label);
    expect(getListingStatusTone(status)).toBe(tone);
  });

  it("normalizes case and whitespace", () => {
    expect(normalizeListingStatus("  pending_review ")).toBe("PENDING_REVIEW");
  });

  it.each([undefined, null, "", "SOMETHING_NEW"])("treats %p as a draft", (status) => {
    expect(normalizeListingStatus(status)).toBe("INACTIVE");
    expect(getListingStatusLabel(status)).toBe("Drafted");
  });

  it.each([
    ["PENDING_REVIEW", "Submitted for review."],
    ["ACTIVE", "Listing moved to Live."],
    ["ARCHIVED", "Listing moved to Archived."],
    ["INACTIVE", "Listing moved to Draft."],
  ])("announces a change to %s", (status, message) => {
    expect(getStatusChangeMessage(status)).toBe(message);
  });

  it("only flags PENDING_REVIEW as submitted for review", () => {
    expect(isSubmittedForReview("pending_review")).toBe(true);
    expect(isSubmittedForReview("ACTIVE")).toBe(false);
    expect(isSubmittedForReview("REJECTED")).toBe(false);
  });
});
