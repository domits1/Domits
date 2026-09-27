import { describe, expect, it, jest } from "@jest/globals";
import ReviewRequestService from "../../functions/ReviewSystem/business/service/reviewRequestService.js";
import ReviewVerificationService from "../../functions/ReviewSystem/business/service/reviewVerificationService.js";
import ReviewService from "../../functions/ReviewSystem/business/service/reviewService.js";

// Review: Covers scheduled requests, verification signals, and moderator decisions.
const NOW = Date.parse("2026-09-22T12:00:00Z");
const booking = { id: "booking-1", guestid: "guest-1", hostid: "host-1", property_id: "property-1",
  status: "Completed", departuredate: NOW - 86400000, guest_email: "guest@example.com", guestname: "Guest" };
const review = { id: "review-1", bookingId: booking.id, propertyId: booking.property_id,
  reviewerUserId: booking.guestid, title: "Great stay", publicReview: "The apartment was very clean and comfortable.", status: "SUBMITTED" };

describe("review request delivery", () => {
  it("generates requests and sends only after claiming a due request", async () => {
    const request = { id: "request-1", bookingId: booking.id, guestId: booking.guestid,
      reviewType: "GUEST_TO_PROPERTY", sendCount: 0, expiresAt: NOW + 29 * 86400000 };
    const repository = {
      listBookingsNeedingReviewRequests: jest.fn().mockResolvedValue([booking]),
      createReviewRequestForBooking: jest.fn().mockResolvedValue(),
      listDueReviewRequests: jest.fn().mockResolvedValue([request]),
      claimReviewRequest: jest.fn().mockResolvedValue(true),
      getBookingById: jest.fn().mockResolvedValue(booking),
      getReviewNotificationPreference: jest.fn().mockResolvedValue({ emailEnabled: true }),
      getReviewByBookingTypeAndReviewer: jest.fn().mockResolvedValue(null),
      finishReviewRequestSend: jest.fn().mockResolvedValue(),
    };
    const client = { send: jest.fn().mockResolvedValue({ Payload: Buffer.from(JSON.stringify({ statusCode: 200 })) }) };
    const service = new ReviewRequestService({ reviewRepository: repository, client, clock: () => NOW });
    await expect(service.processDue()).resolves.toEqual({ generated: 1, results: [{ id: "request-1", status: "SENT" }] });
    expect(repository.createReviewRequestForBooking).toHaveBeenCalledWith(booking, NOW);
    expect(client.send).toHaveBeenCalledTimes(1);
    expect(repository.finishReviewRequestSend).toHaveBeenCalledWith("request-1", NOW, true);
  });

  it("suppresses opted-out emails", async () => {
    const repository = {
      listBookingsNeedingReviewRequests: jest.fn().mockResolvedValue([]),
      listDueReviewRequests: jest.fn().mockResolvedValue([{ id: "request-1", bookingId: booking.id,
        guestId: booking.guestid, reviewType: "GUEST_TO_PROPERTY" }]),
      claimReviewRequest: jest.fn().mockResolvedValue(true),
      getBookingById: jest.fn().mockResolvedValue(booking),
      getReviewNotificationPreference: jest.fn().mockResolvedValue({ emailEnabled: false }),
      getReviewByBookingTypeAndReviewer: jest.fn().mockResolvedValue(null),
      suppressReviewRequest: jest.fn().mockResolvedValue(),
    };
    const client = { send: jest.fn() };
    const service = new ReviewRequestService({ reviewRepository: repository, client, clock: () => NOW });
    await expect(service.processDue()).resolves.toEqual({ generated: 0, results: [{ id: "request-1", status: "SUPPRESSED" }] });
    expect(client.send).not.toHaveBeenCalled();
  });

  it("resolves a guest email when the booking has none", async () => {
    const client = { send: jest.fn().mockResolvedValue({
      Payload: Buffer.from(JSON.stringify({ statusCode: 200, body: JSON.stringify([
        { Attributes: [{ Name: "email", Value: "account@example.com" }] },
      ]) })),
    }) };
    const service = new ReviewRequestService({ reviewRepository: {}, client });
    await expect(service.getGuestEmail({ guestid: "guest-1", guest_email: null })).resolves.toBe("account@example.com");
    expect(client.send).toHaveBeenCalledTimes(1);
  });
});

describe("review verification and moderation", () => {
  it("holds a link-bearing review for human review", () => {
    const result = new ReviewVerificationService().evaluate({
      review: { ...review, publicReview: "Visit https://example.com for details" }, booking, now: NOW,
    });
    expect(result.status).toBe("NEEDS_REVIEW");
    expect(JSON.parse(result.evidenceJson).signals).toContain("EXTERNAL_LINK");
  });

  it("holds duplicate text and unusually rapid submissions", () => {
    const result = new ReviewVerificationService().evaluate({ review, booking, now: NOW,
      recentReviews: [1, 2, 3].map((number) => ({ id: `previous-${number}`,
        publicReview: number === 1 ? review.publicReview : "Different text", createdAt: NOW - 3600000 })),
    });
    expect(JSON.parse(result.evidenceJson).signals).toEqual(expect.arrayContaining([
      "DUPLICATE_CONTENT", "HIGH_SUBMISSION_VELOCITY",
    ]));
  });

  it("requires a reason to approve a flagged review and records the override", async () => {
    const verification = new ReviewVerificationService().evaluate({
      review: { ...review, publicReview: "Visit https://example.com for details" }, booking, now: NOW,
    });
    const repository = {
      getReviewById: jest.fn().mockResolvedValue(review),
      getBookingById: jest.fn().mockResolvedValue(booking),
      getReviewVerification: jest.fn().mockResolvedValue(verification),
      decideReview: jest.fn().mockResolvedValue({ ...review, status: "PUBLISHED" }),
    };
    const service = new ReviewService({ reviewRepository: repository,
      authManager: { authenticate: jest.fn().mockResolvedValue({ sub: "mod-1", role: "moderator" }) },
      clock: () => NOW });
    const event = (body) => ({ headers: { Authorization: "token" }, pathParameters: { id: review.id }, body: JSON.stringify(body) });
    await expect(service.moderateReview(event({ decision: "APPROVE" }))).rejects.toMatchObject({ statusCode: 400 });
    await service.moderateReview(event({ decision: "APPROVE", reason: "Link is benign" }));
    expect(repository.decideReview).toHaveBeenCalledWith(expect.objectContaining({
      expectedStatus: "SUBMITTED", status: "PUBLISHED",
      verification: expect.objectContaining({ status: "VERIFIED_STAY" }),
      moderation: expect.objectContaining({ moderatedByUserId: "mod-1", reason: "Link is benign" }),
    }));
  });

  it("rejects a non-moderator before loading review data", async () => {
    const repository = { getReviewById: jest.fn() };
    const service = new ReviewService({ reviewRepository: repository,
      authManager: { authenticate: jest.fn().mockResolvedValue({ sub: "guest-1", role: "guest" }) } });
    await expect(service.getModerationQueue({ headers: { Authorization: "token" } })).rejects.toMatchObject({ statusCode: 403 });
    expect(repository.getReviewById).not.toHaveBeenCalled();
  });
});
