import { describe, expect, it } from "@jest/globals";
import ReviewStatusService from "../../functions/ReviewSystem/business/service/reviewStatusService.js";

const service = new ReviewStatusService();

describe("ReviewStatusService", () => {
  it("allows new reviews to start as draft", () => {
    expect(service.resolveInitialStatus("DRAFT")).toBe("DRAFT");
  });

  it("allows new reviews to start as submitted", () => {
    expect(service.resolveInitialStatus("SUBMITTED")).toBe("SUBMITTED");
  });

  it("rejects new reviews starting as published", () => {
    expect(() => service.resolveInitialStatus("PUBLISHED")).toThrow(
      "New reviews can only be saved as DRAFT or SUBMITTED."
    );
  });

  it("allows authors to submit drafts", () => {
    expect(
      service.resolveUpdateStatus({
        currentStatus: "DRAFT",
        requestedStatus: "SUBMITTED",
        actorUserId: "guest-1",
        authorUserId: "guest-1",
      })
    ).toBe("SUBMITTED");
  });

  it("rejects authors publishing their own reviews", () => {
    expect(() =>
      service.resolveUpdateStatus({
        currentStatus: "PENDING_MODERATION",
        requestedStatus: "PUBLISHED",
        actorUserId: "guest-1",
        authorUserId: "guest-1",
      })
    ).toThrow("Review status transition is not allowed.");
  });

  it.each([
    ["SUBMITTED", "VERIFIED"],
    ["VERIFIED", "PENDING_MODERATION"],
    ["PENDING_MODERATION", "PUBLISHED"],
    ["PENDING_MODERATION", "REJECTED"],
  ])("allows moderators to transition %s to %s", (currentStatus, requestedStatus) => {
    expect(
      service.resolveUpdateStatus({
        currentStatus,
        requestedStatus,
        actorUserId: "moderator-1",
        authorUserId: "guest-1",
        actorRole: "moderator",
      })
    ).toBe(requestedStatus);
  });

  it.each([
    ["DRAFT", "UNVERIFIED", "UNPUBLISHED"],
    ["SUBMITTED", "UNVERIFIED", "UNPUBLISHED"],
    ["VERIFIED", "VERIFIED_STAY", "UNPUBLISHED"],
    ["PUBLISHED", "VERIFIED_STAY", "PUBLISHED"],
    ["REJECTED", "UNVERIFIED", "REJECTED"],
  ])(
    "derives verification and publication states for %s",
    (status, verificationStatus, publicationStatus) => {
      expect(service.getDerivedStatuses(status)).toEqual({
        verificationStatus,
        publicationStatus,
      });
    }
  );
});
