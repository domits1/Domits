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

  it("allows moderators to verify submitted reviews", () => {
    expect(
      service.resolveUpdateStatus({
        currentStatus: "SUBMITTED",
        requestedStatus: "VERIFIED",
        actorUserId: "moderator-1",
        authorUserId: "guest-1",
        actorRole: "moderator",
      })
    ).toBe("VERIFIED");
  });

  it("allows moderators to move verified reviews to pending moderation", () => {
    expect(
      service.resolveUpdateStatus({
        currentStatus: "VERIFIED",
        requestedStatus: "PENDING_MODERATION",
        actorUserId: "moderator-1",
        authorUserId: "guest-1",
        actorRole: "moderator",
      })
    ).toBe("PENDING_MODERATION");
  });

  it("allows moderators to publish pending reviews", () => {
    expect(
      service.resolveUpdateStatus({
        currentStatus: "PENDING_MODERATION",
        requestedStatus: "PUBLISHED",
        actorUserId: "moderator-1",
        authorUserId: "guest-1",
        actorRole: "moderator",
      })
    ).toBe("PUBLISHED");
  });

  it("allows moderators to reject pending reviews", () => {
    expect(
      service.resolveUpdateStatus({
        currentStatus: "PENDING_MODERATION",
        requestedStatus: "REJECTED",
        actorUserId: "moderator-1",
        authorUserId: "guest-1",
        actorRole: "moderator",
      })
    ).toBe("REJECTED");
  });

  it("derives unpublished and unverified state for drafts", () => {
    expect(service.getDerivedStatuses("DRAFT")).toEqual({
      verificationStatus: "UNVERIFIED",
      publicationStatus: "UNPUBLISHED",
    });
  });

  it("derives unpublished and unverified state for submitted reviews", () => {
    expect(service.getDerivedStatuses("SUBMITTED")).toEqual({
      verificationStatus: "UNVERIFIED",
      publicationStatus: "UNPUBLISHED",
    });
  });

  it("derives verified but unpublished state for verified reviews", () => {
    expect(service.getDerivedStatuses("VERIFIED")).toEqual({
      verificationStatus: "VERIFIED_STAY",
      publicationStatus: "UNPUBLISHED",
    });
  });

  it("derives published state for published reviews", () => {
    expect(service.getDerivedStatuses("PUBLISHED")).toEqual({
      verificationStatus: "VERIFIED_STAY",
      publicationStatus: "PUBLISHED",
    });
  });

  it("derives rejected state for rejected reviews", () => {
    expect(service.getDerivedStatuses("REJECTED")).toEqual({
      verificationStatus: "UNVERIFIED",
      publicationStatus: "REJECTED",
    });
  });
});
