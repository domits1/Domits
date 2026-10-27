jest.mock("../../functions/ReviewSystem/data/reviewRepository.js", () => ({
  ReviewRepository: jest.fn(),
}));

import { ReviewService } from "../../functions/ReviewSystem/business/service/reviewService.js";

describe("Guest review publication", () => {
  const now = Date.parse("2026-10-23T12:00:00Z");
  let repository, service, draft, booking;
  const published = () => ({
    ...draft, status: "PUBLISHED", publication_status: "PUBLISHED", updated_at: now,
  });

  beforeEach(() => {
    draft = {
      id: "review-1", booking_id: "booking-1", property_id: "property-1",
      host_id: "host-1", reviewer_user_id: "guest-1", reviewee_user_id: "host-1",
      review_type: "GUEST_TO_PROPERTY", overall_rating: 5, title: "Great stay",
      public_review: "Comfortable and quiet.", private_feedback: "Private note.",
      verification_status: "UNVERIFIED", publication_status: "UNPUBLISHED",
      status: "DRAFT", created_at: now - 2000, updated_at: now - 1000,
    };
    booking = {
      id: "booking-1", guestid: "guest-1", hostid: "host-1",
      property_id: "property-1", status: "Paid", departuredate: now - 3000,
    };
    repository = {
      findById: jest.fn().mockImplementation(async () => ({ ...draft })),
      findBookingById: jest.fn().mockImplementation(async () => ({ ...booking })),
      publishDraft: jest.fn().mockImplementation(async () => published()),
    };
    service = new ReviewService({ repository, now: () => now });
  });

  it("publishes an eligible draft without exposing private feedback", async () => {
    const result = await service.publishReview("guest-1", draft.id);
    expect(result).toMatchObject({
      id: draft.id, status: "PUBLISHED", publication_status: "PUBLISHED",
    });
    expect(result).not.toHaveProperty("private_feedback");
    const options = repository.publishDraft.mock.calls[0][0];
    expect(options).toMatchObject({
      reviewId: draft.id, expectedUpdatedAt: draft.updated_at, updatedAt: now,
    });
    await expect(options.authorize(draft)).resolves.toBe(true);
    await expect(options.authorize({ ...draft, reviewer_user_id: "other" })).resolves.toBe(false);
  });

  it("returns an already published review without writing again", async () => {
    repository.findById.mockResolvedValue(published());
    await expect(service.publishReview("guest-1", draft.id))
      .resolves.toMatchObject({ status: "PUBLISHED" });
    expect(repository.publishDraft).not.toHaveBeenCalled();
    expect(repository.findBookingById).not.toHaveBeenCalled();
  });

  it("accepts concurrent publication without another write or private feedback", async () => {
    repository.findById.mockResolvedValueOnce({ ...draft }).mockResolvedValueOnce(published());
    repository.publishDraft.mockResolvedValue(null);
    const result = await service.publishReview("guest-1", draft.id);
    expect(result).toMatchObject({ status: "PUBLISHED" });
    expect(result).not.toHaveProperty("private_feedback");
    expect(repository.publishDraft).toHaveBeenCalledTimes(1);
  });

  it("rejects a changed draft instead of publishing the new version", async () => {
    repository.findById.mockResolvedValueOnce({ ...draft })
      .mockResolvedValueOnce({ ...draft, updated_at: now });
    repository.publishDraft.mockResolvedValue(null);
    await expect(service.publishReview("guest-1", draft.id))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  it("rechecks authorization after a publication conflict", async () => {
    repository.findById.mockResolvedValueOnce({ ...draft })
      .mockResolvedValueOnce({ ...published(), reviewer_user_id: "other" });
    repository.publishDraft.mockResolvedValue(null);
    await expect(service.publishReview("guest-1", draft.id))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  it("rejects publication by another guest", async () => {
    await expect(service.publishReview("other", draft.id))
      .rejects.toMatchObject({ statusCode: 403 });
    expect(repository.publishDraft).not.toHaveBeenCalled();
  });

  it.each([
    { status: "Cancelled" }, { departuredate: now + 1000 },
    { guestid: "other" }, { property_id: "other" }, { hostid: "other" },
  ])("rejects an ineligible or reassigned booking: %o", async (changes) => {
    Object.assign(booking, changes);
    await expect(service.publishReview("guest-1", draft.id)).rejects.toThrow();
    expect(repository.publishDraft).not.toHaveBeenCalled();
  });

  it.each(["DELETED", "REJECTED"])("does not publish a %s review", async (status) => {
    draft.status = status;
    await expect(service.publishReview("guest-1", draft.id))
      .rejects.toMatchObject({ statusCode: 404 });
    expect(repository.publishDraft).not.toHaveBeenCalled();
  });

  it.each([null, "DELETED", "REJECTED"])(
    "rejects a review removed during publication: %s", async (status) => {
      repository.findById.mockResolvedValueOnce({ ...draft })
        .mockResolvedValueOnce(status === null ? null : { ...draft, status });
      repository.publishDraft.mockResolvedValue(null);
      await expect(service.publishReview("guest-1", draft.id))
        .rejects.toMatchObject({ statusCode: 404 });
    }
  );
});
