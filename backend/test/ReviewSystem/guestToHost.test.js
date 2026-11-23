jest.mock("../../functions/ReviewSystem/data/reviewRepository.js", () => ({ ReviewRepository: jest.fn() }));
import { ReviewService } from "../../functions/ReviewSystem/business/service/reviewService.js";
import { SeedHostReviewCategories20261123 } from "../../ORM/migrations/20261123_seed_host_review_categories.js";

describe("Guest to host reviews", () => {
  const now = 1800000000000;
  const payload = { booking_id: "booking", review_type: "GUEST_TO_HOST", overall_rating: 5,
    title: "Welcoming host", public_review: "Excellent communication.",
    category_ratings: { communication: 5, responsiveness: 4, hospitality: 5 } };
  let booking, repository, service, records;
  beforeEach(() => {
    booking = { id: "booking", guestid: "guest", hostid: "host", property_id: "property",
      status: "Confirmed", departuredate: now - 1000 };
    records = [];
    repository = {
      findBookingById: jest.fn(async () => booking),
      findReviewByBookingTypeAndReviewer: jest.fn(async (key) => records.find((record) =>
        Object.entries(key).every(([field, value]) => record[field] === value))),
      findActiveCategoryKeys: jest.fn(async (type) => new Set(type === "GUEST_TO_HOST"
        ? ["communication", "responsiveness", "hospitality"] : ["cleanliness"])),
      create: jest.fn(async (record) => { records.push(record); return record; }),
      findById: jest.fn(async (id) => records.find((record) => record.id === id)),
      publishDraft: jest.fn(async (options) => {
        const record = records.find((item) => item.id === options.reviewId);
        options.validate(record);
        expect(await options.authorize(record)).toBe(true);
        Object.assign(record, { status: options.to,
          publication_status: options.to === "PUBLISHED" ? "PUBLISHED" : "UNPUBLISHED" });
        return record;
      }),
    };
    service = new ReviewService({ repository, now: () => now, alerts: {
      afterAdminEvent: jest.fn(), afterGuestEvent: jest.fn(), afterPublication: jest.fn(),
    } });
  });

  it("uses authenticated and booking identities, configured ratings and existing states", async () => {
    const result = await service.createReview("guest", { ...payload, reviewer_user_id: "spoof",
      host_id: "spoof", reviewee_user_id: "spoof", property_id: "spoof" });
    expect(result).toMatchObject({ reviewer_user_id: "guest", host_id: "host", reviewee_user_id: "host",
      property_id: "property", verification_status: "VERIFIED_STAY", status: "DRAFT", publication_status: "UNPUBLISHED" });
    expect(repository.findActiveCategoryKeys).toHaveBeenCalledWith("GUEST_TO_HOST");
    expect(repository.create).toHaveBeenCalledWith(result, payload.category_ratings);
    await expect(service.publishReview("guest", result.id)).resolves.toMatchObject({ status: "PENDING_APPROVAL" });
  });

  it.each([undefined, "GUEST_TO_PROPERTY"])("preserves property reviews with type %s", async (review_type) => {
    await expect(service.createReview("guest", { ...payload, review_type, category_ratings: { cleanliness: 4 } }))
      .resolves.toMatchObject({ review_type: "GUEST_TO_PROPERTY", verification_status: "UNVERIFIED" });
  });

  it.each([null, "", "HOST_TO_GUEST", "INVALID"])("rejects unsupported review type %s", async (review_type) => {
    await expect(service.createReview("guest", { ...payload, review_type })).rejects.toMatchObject({ statusCode: 400 });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it.each([0, 6, 2.5, "5", null])("rejects overall rating %s", async (overall_rating) => {
    await expect(service.createReview("guest", { ...payload, overall_rating })).rejects.toMatchObject({ statusCode: 400 });
  });
  it.each([1, 5])("accepts overall rating %s", async (overall_rating) => {
    await expect(service.createReview("guest", { ...payload, overall_rating })).resolves.toMatchObject({ overall_rating });
  });

  it.each([
    ["GUEST_TO_HOST", { cleanliness: 5 }], ["GUEST_TO_PROPERTY", { hospitality: 5 }],
  ])("rejects categories belonging to another type: %s", async (review_type, category_ratings) => {
    await expect(service.createReview("guest", { ...payload, review_type, category_ratings }))
      .rejects.toMatchObject({ statusCode: 400 });
  });
  it("rejects inactive categories", async () => {
    repository.findActiveCategoryKeys.mockResolvedValue(new Set());
    await expect(service.createReview("guest", payload)).rejects.toMatchObject({ statusCode: 400 });
  });

  it.each([
    [null, 404], [{ guestid: "other" }, 403], [{ hostid: "guest" }, 403],
    [{ status: "Cancelled" }, 400], [{ departuredate: now + 1 }, 400], [{ departuredate: null }, 400],
  ])("rejects an ineligible stay: %o", async (changes, statusCode) => {
    booking = changes === null ? null : { ...booking, ...changes };
    await expect(service.createReview("guest", payload)).rejects.toMatchObject({ statusCode });
    expect(repository.create).not.toHaveBeenCalled();
  });
  it("requires authentication", async () => {
    await expect(service.createReview("", payload)).rejects.toMatchObject({ statusCode: 401 });
  });

  it.each([false, true])("allows both types in either order, but prevents a second host review (%s)", async (hostFirst) => {
    const property = { ...payload, review_type: "GUEST_TO_PROPERTY", category_ratings: {} };
    for (const item of hostFirst ? [payload, property] : [property, payload]) await service.createReview("guest", item);
    expect(records.map((record) => record.review_type).sort()).toEqual(["GUEST_TO_HOST", "GUEST_TO_PROPERTY"]);
    await expect(service.createReview("guest", payload)).rejects.toMatchObject({ statusCode: 409 });
    expect(records).toHaveLength(2);
  });
  it("translates a concurrent duplicate database error", async () => {
    repository.create.mockRejectedValue({ driverError: { code: "23505", constraint: "review_booking_type_reviewer_unique" } });
    await expect(service.createReview("guest", payload)).rejects.toMatchObject({ statusCode: 409 });
  });

  it("reuses approval and publication with staff authorization", async () => {
    const review = await service.createReview("guest", payload);
    await service.publishReview("guest", review.id);
    service.assertReviewApprover = jest.fn().mockResolvedValue(undefined);
    await expect(service.approveReview("staff", "admin", review.id, now))
      .resolves.toMatchObject({ status: "APPROVED", publication_status: "UNPUBLISHED" });
    await expect(service.publishReview("staff", review.id, "admin"))
      .resolves.toMatchObject({ status: "PUBLISHED", publication_status: "PUBLISHED", verification_status: "VERIFIED_STAY" });
    expect(service.assertReviewApprover).toHaveBeenCalledWith("staff", "admin", undefined);
  });
  it.each([{ hostid: "other" }, { guestid: "other" }, { status: "Cancelled" }])(
    "rechecks booking eligibility before submission: %o", async (changes) => {
      const review = await service.createReview("guest", payload);
      Object.assign(booking, changes);
      await expect(service.publishReview("guest", review.id)).rejects.toThrow();
      expect(repository.publishDraft).not.toHaveBeenCalled();
    });

  it("seeds the three categories for both schemas through configuration only", async () => {
    const queryRunner = { query: jest.fn() };
    await new SeedHostReviewCategories20261123().up(queryRunner);
    expect(queryRunner.query).toHaveBeenCalledTimes(6);
    for (const schema of ["test", "main"]) {
      for (const key of ["communication", "responsiveness", "hospitality"]) {
        expect(queryRunner.query).toHaveBeenCalledWith(expect.stringContaining(`INSERT INTO ${schema}.review_category`),
          [expect.any(String), key, key[0].toUpperCase() + key.slice(1), expect.any(Number), expect.any(Number)]);
      }
    }
  });
});
