jest.mock("../../functions/ReviewSystem/data/reviewRepository.js", () => ({
  ReviewRepository: jest.fn(),
}));

import { ReviewService } from "../../functions/ReviewSystem/business/service/reviewService.js";
import { AuthManager } from "../../functions/ReviewSystem/auth/authManager.js";
import { Controller } from "../../functions/ReviewSystem/controller/controller.js";
import { ReviewRepository } from "../../functions/ReviewSystem/data/reviewRepository.js";

describe("Merged review query and edit routes", () => {
  const id = "12345678-1234-1234-1234-123456789abc";
  const timestamp = Date.parse("2026-10-01T12:00:00Z");
  const review = { id, reviewer_user_id: "guest", overall_rating: 4, public_review: "Good",
    created_at: timestamp - 100, updated_at: timestamp - 50, status: "PUBLISHED" };
  let repository, service, controller;
  const event = (method, query = {}, body) => ({ httpMethod: method, queryStringParameters: query,
    body: body === undefined ? undefined : JSON.stringify(body),
    requestContext: { authorizer: { claims: { sub: "guest", "cognito:username": "verified-user" } } } });
  beforeEach(() => {
    repository = {
      findReviewById: jest.fn().mockResolvedValue({ ...review }),
      updateEditableReview: jest.fn().mockResolvedValue({ affected: 1, updated_at: timestamp }),
      findManagedProperty: jest.fn().mockResolvedValue({ id: "p1" }),
      getPropertyReviewScore: jest.fn().mockResolvedValue({ property_id: "p1", overall_score: 4, review_count: 1 }),
      getPropertyCategoryRatings: jest.fn().mockResolvedValue([]),
    };
    service = new ReviewService({ repository, now: () => timestamp, editWindowMs: 1000 });
    controller = new Controller({ service });
  });

  it("dispatches managed-property scopes using the verified subject", async () => {
    for (const scope of ["property-score", "property-categories"]) {
      expect((await controller.getReviews(event("GET", { scope, propertyId: "p1", username: "spoof" }))).statusCode).toBe(200);
    }
    expect(repository.findManagedProperty).toHaveBeenCalledWith("p1", "guest");
  });

  it("loads the query-based edit form using the verified subject", async () => {
    const result = await controller.getReviews(event("GET", { reviewId: id }));
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toMatchObject({ id, updated_at: review.updated_at });
  });

  it("supports the existing query-based PATCH endpoint with normalized text and client version", async () => {
    const result = await controller.manageReviews(event("PATCH", { reviewId: id }, {
      overall_rating: 5, public_review: " Good\r\nStay ", updated_at: review.updated_at,
    }));
    expect(result.statusCode).toBe(200);
    expect(repository.updateEditableReview).toHaveBeenCalledWith(expect.objectContaining({ id, guestId: "guest",
      previousUpdatedAt: review.updated_at, publicReview: "Good\nStay", editWindowMs: 1000 }));
  });

  it("rejects stale versions and expired edit windows without saving", async () => {
    const body = { overall_rating: 5, public_review: "Changed", updated_at: 1 };
    expect((await controller.updateReview(event("PATCH", { reviewId: id }, body))).statusCode).toBe(409);
    service.editWindowMs = 10;
    expect((await controller.getReviews(event("GET", { reviewId: id }))).statusCode).toBe(403);
    expect(repository.updateEditableReview).not.toHaveBeenCalled();
  });

  it("does not allow editing a deleted review or conflicting path/query IDs", async () => {
    repository.findReviewById.mockResolvedValue({ ...review, status: "DELETED" });
    expect((await controller.getReviews(event("GET", { reviewId: id }))).statusCode).toBe(404);
    const request = { ...event("PATCH", { reviewId: id }, {}), pathParameters: { id: "different" } };
    expect((await controller.updateReview(request)).statusCode).toBe(400);
    expect(repository.updateEditableReview).not.toHaveBeenCalled();
  });
});

describe('Review creation and existing operations', () => {
  const now = Date.parse("2026-10-01T12:00:00Z");
  const booking = {
    id: "reservation-1",
    guestid: "guest-1",
    property_id: "property-1",
    hostid: "host-1",
    status: "Paid",
    departuredate: now - 1000,
  };

  it.each([
    undefined,
    null,
    "",
    " \n\t ",
    42,
    true,
    {},
    [],
    "x".repeat(501),
    "Stay\u0000",
  ])(
    "rejects invalid written content before persistence: %p",
    async (public_review) => {
      const response = await controller.createReview({
        headers: { Authorization: "token" },
        body: JSON.stringify({ ...payload, public_review }),
        requestContext: {
          authorizer: {
            claims: { sub: booking.guestid },
          },
        },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).message).toBeTruthy();
      expect(repository.findBookingById).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    }
  );

  it.each([
    ["x", "x"],
    ["x".repeat(500), "x".repeat(500)],
    [
      "  Quiet room.\r\nBusy street.\rGood transport.  ",
      "Quiet room.\nBusy street.\nGood transport.",
    ],
    [
      "Café 😊 — 5 < 10 & O'Brien's room",
      "Café 😊 — 5 < 10 & O'Brien's room",
    ],
    [
      "<script>alert('test')</script>",
      "<script>alert('test')</script>",
    ],
  ])(
    "stores normalized plain text with verified booking identities: %p",
    async (input, expected) => {
      const saved = await service.createReview(booking.guestid, {
        ...payload,
        public_review: input,
        reviewer_user_id: "spoof",
        property_id: "spoof",
      });

      expect(saved.public_review).toBe(expected);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          public_review: expected,
          booking_id: booking.id,
          reviewer_user_id: booking.guestid,
          property_id: booking.property_id,
          host_id: booking.hostid,
        }),
        {}
      );
    }
  );

  // The existing payload, variables, beforeEach, and remaining tests follow here.
  const payload = { booking_id: booking.id, overall_rating: 5, title: "Great stay", public_review: "Lovely place." };

  let repository;
  let service;
  let controller;
  let authManager;

  beforeEach(() => {
    repository = {
      findBookingById: jest.fn().mockResolvedValue({ ...booking }),
      create: jest.fn().mockImplementation(async (record) => record),
      findReviewByBookingTypeAndReviewer: jest.fn().mockResolvedValue(null),
      findActiveCategoryKeys: jest.fn().mockResolvedValue(new Set(["cleanliness"])),
      findForUser: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue({ id: "review-1", reviewer_user_id: "guest-1", status: "DRAFT" }),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
      findPublicForProperty: jest.fn().mockResolvedValue([]),
    };
    service = new ReviewService({ repository, now: () => now });
    authManager = new AuthManager();
    jest.spyOn(authManager, "getUser");
    controller = new Controller({ service, authManager });
  });

  const reviewEvent = (method, scope, userId = "guest-1") => ({
    httpMethod: method,
    requestContext: { authorizer: { claims: { sub: userId } } },
    queryStringParameters: { scope },
    pathParameters: { id: "review-1" },
  });

  it.each(["written", "received"])("lists %s reviews for the verified caller", async (scope) => {
    const response = await controller.manageReviews(reviewEvent("GET", scope));
    expect(response.statusCode).toBe(200);
    expect(repository.findForUser).toHaveBeenCalledWith("guest-1", scope);
  });

  it("rejects unsupported list scopes", async () => {
    expect((await controller.manageReviews(reviewEvent("GET", "all"))).statusCode).toBe(400);
    expect(repository.findForUser).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated list requests", async () => {
    expect((await controller.manageReviews({ httpMethod: "GET" })).statusCode).toBe(401);
    expect(repository.findForUser).not.toHaveBeenCalled();
  });

  it("soft deletes the author's review", async () => {
    expect((await controller.manageReviews(reviewEvent("DELETE"))).statusCode).toBe(204);
    expect(repository.softDelete).toHaveBeenCalledWith("review-1", "guest-1", now);
  });

  it("rejects deletion by another caller", async () => {
    expect((await controller.manageReviews(reviewEvent("DELETE", undefined, "other"))).statusCode).toBe(403);
    expect(repository.softDelete).not.toHaveBeenCalled();
  });

  it.each([null, { status: "DELETED" }])("rejects missing or deleted reviews: %p", async (review) => {
    repository.findById.mockResolvedValue(review);
    expect((await controller.manageReviews(reviewEvent("DELETE"))).statusCode).toBe(404);
    expect(repository.softDelete).not.toHaveBeenCalled();
  });

  it("rejects deletion without a review ID", async () => {
    expect((await controller.manageReviews({ ...reviewEvent("DELETE"), pathParameters: {} })).statusCode).toBe(400);
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it("reads public reviews without authentication", async () => {
    const response = await controller.getPublicPropertyReviews({ pathParameters: { propertyId: "property-1" } });
    expect(response.statusCode).toBe(200);
    expect(repository.findPublicForProperty).toHaveBeenCalledWith("property-1", { limit: 20, offset: 0 });
  });

  it.each([{ limit: "101" }, { offset: "-1" }, { limit: "1.5" }])("rejects invalid public pagination: %p", async (query) => {
    await expect(service.getPublicPropertyReviews("property-1", query)).rejects.toMatchObject({ statusCode: 400 });
    expect(repository.findPublicForProperty).not.toHaveBeenCalled();
  });

  it("uses booking identities instead of client-supplied identities", async () => {
    await service.createReview(booking.guestid, {
      ...payload,
      reviewer_user_id: "spoof",
      property_id: "spoof",
      host_id: "spoof",
      reviewee_user_id: "spoof", review_type: "HOST_TO_GUEST",
      status: "PUBLISHED", verification_status: "VERIFIED_STAY", publication_status: "PUBLISHED",
    });
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      reviewer_user_id: booking.guestid,
      property_id: booking.property_id,
      host_id: booking.hostid,
      booking_id: booking.id,
      reviewee_user_id: booking.hostid,
      review_type: "GUEST_TO_PROPERTY",
      publication_status: "UNPUBLISHED",
      verification_status: "UNVERIFIED",
      status: "DRAFT",
    }), {});
  });

  it.each([
    ["Declined", now - 1000],
    ["Inquiry", now - 1000],
    ["Awaiting Payment", now - 1000],
    ["Cancelled", now - 1000],
    ["Paid", now + 1000],
    ["Paid", "invalid"],
    ["Paid", null],
    ["Paid", 0],
  ])("rejects status %s with checkout %s", async (status, departuredate) => {
    repository.findBookingById.mockResolvedValue({ ...booking, status, departuredate });
    await expect(service.createReview(booking.guestid, payload))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("rejects another guest", async () => {
    await expect(service.createReview("another-guest", payload))
      .rejects.toMatchObject({ statusCode: 403 });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("rejects reviewing the caller's own property before persistence", async () => {
    repository.findBookingById.mockResolvedValue({
      ...booking,
      hostid: booking.guestid,
    });

    await expect(service.createReview(booking.guestid, payload)).rejects.toMatchObject({
      statusCode: 403,
      message: "You cannot review your own property.",
    });

    expect(repository.create).not.toHaveBeenCalled();
  });

  it("rejects a missing reservation", async () => {
    repository.findBookingById.mockResolvedValue(null);
    await expect(service.createReview(booking.guestid, payload))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it("returns a conflict when the database rejects a duplicate reservation", async () => {
    repository.create.mockRejectedValue(Object.assign(new Error("Duplicate"), {
      code: "23505",
      constraint: "review_booking_type_reviewer_unique",
    }));
    await expect(service.createReview(booking.guestid, payload))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  it.each(["Authorization", "authorization"])("accepts the %s header", async (header) => {
    const result = await controller.createReview({
      headers: { [header]: "access-token" },
      requestContext: { authorizer: { claims: { sub: booking.guestid } } },
      body: JSON.stringify(payload),
    });
    expect(result.statusCode).toBe(201);
    expect(authManager.getUser).toHaveBeenCalledWith(expect.objectContaining({
      requestContext: { authorizer: { claims: { sub: booking.guestid } } },
    }));
  });

  it("rejects missing verified authorizer claims", async () => {
    const result = await controller.createReview({ headers: {}, body: JSON.stringify(payload) });
    expect(result.statusCode).toBe(401);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("rejects an authorization header without verified authorizer claims", async () => {
    const result = await controller.createReview({
      headers: { Authorization: "unverified-token" }, body: JSON.stringify(payload),
    });
    expect(result.statusCode).toBe(401);
    expect(repository.findBookingById).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it.each([undefined, "", " ", "{", "null", "[]"])("rejects malformed review bodies: %s", async (body) => {
    const result = await controller.createReview({
      headers: { Authorization: "access-token" }, requestContext: { authorizer: { claims: { sub: booking.guestid } } },
      body,
    });
    expect(result.statusCode).toBe(400);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("decodes base64 request bodies and awaits authentication", async () => {
    authManager.getUser.mockResolvedValue({ userId: booking.guestid });
    const result = await controller.createReview({
      body: Buffer.from(JSON.stringify(payload)).toString("base64"),
      isBase64Encoded: true,
    });
    expect(result.statusCode).toBe(201);
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ reviewer_user_id: booking.guestid }), {});
  });

  it.each([undefined, {}, { userId: " " }])("rejects invalid authentication results: %p", async (user) => {
    authManager.getUser.mockResolvedValue(user);
    const result = await controller.createReview({ body: JSON.stringify(payload) });
    expect(result.statusCode).toBe(401);
    expect(repository.findBookingById).not.toHaveBeenCalled();
  });

  it.each([undefined, null, "", " ", 123])("rejects invalid service caller IDs before storage: %p", async (callerUserId) => {
    await expect(service.createReview(callerUserId, payload)).rejects.toMatchObject({ statusCode: 401 });
    expect(repository.findBookingById).not.toHaveBeenCalled();
  });

  it.each([null, { statusCode: "400" }, { statusCode: 200 }, { statusCode: 600 }])("handles invalid error status codes safely: %p", (error) => {
    const log = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      const result = controller.handleError(error);
      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body).message).toBe("Something went wrong, please contact support.");
    } finally {
      log.mockRestore();
    }
  });

  it.each([undefined, null, "", "5", 0, 6, -1, 2.5, NaN, Infinity, true, {}, [], { toString: null }])(
    "rejects invalid overall rating before accessing storage: %p", async (overall_rating) => {
      await expect(service.createReview(booking.guestid, { ...payload, overall_rating }))
        .rejects.toMatchObject({ statusCode: 400 });
      expect(repository.findBookingById).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    }
  );

  it.each([undefined, null, ""])("returns a useful message for missing rating: %p", async (overall_rating) => {
    const result = await controller.createReview({
      headers: { Authorization: "access-token" }, requestContext: { authorizer: { claims: { sub: booking.guestid } } }, body: JSON.stringify({ ...payload, overall_rating }),
    });
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).message).toBe("Please select an overall experience rating from 1 to 5 stars.");
  });

  it.each([0, 6, 2.5, "5"])("rejects an invalid rating through HTTP: %p", async (overall_rating) => {
    const result = await controller.createReview({
      headers: { Authorization: "access-token" }, requestContext: { authorizer: { claims: { sub: booking.guestid } } }, body: JSON.stringify({ ...payload, overall_rating }),
    });
    expect(result.statusCode).toBe(400);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it.each([1, 2, 3, 4, 5])("saves and returns %s stars for the correct review", async (overall_rating) => {
    repository.create.mockImplementation(async (record) => ({ ...record, id: "review-1" }));
    const result = await controller.createReview({
      headers: { Authorization: "access-token" }, requestContext: { authorizer: { claims: { sub: booking.guestid } } }, body: JSON.stringify({ ...payload, overall_rating }),
    });
    expect(result.statusCode).toBe(201);
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      booking_id: booking.id, reviewer_user_id: booking.guestid, overall_rating,
    }), {});
    expect(JSON.parse(result.body)).toEqual(expect.objectContaining({
      id: "review-1", booking_id: booking.id, overall_rating,
    }));
  });

  it("looks up the canonical booking ID and checks the full duplicate key", async () => {
    await service.createReview(booking.guestid, { ...payload, booking_id: ` ${booking.id} ` });
    expect(repository.findBookingById).toHaveBeenCalledWith(booking.id);
    expect(repository.findReviewByBookingTypeAndReviewer).toHaveBeenCalledWith({
      booking_id: booking.id, review_type: "GUEST_TO_PROPERTY", reviewer_user_id: booking.guestid,
    });
  });

  it("rejects an existing review for the same booking, type and reviewer", async () => {
    repository.findReviewByBookingTypeAndReviewer.mockResolvedValue({ id: "existing" });
    await expect(service.createReview(booking.guestid, payload)).rejects.toMatchObject({ statusCode: 409 });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("does not consider a different stored review type or reviewer a duplicate", async () => {
    const reviews = [
      { booking_id: booking.id, review_type: "OTHER_STORED_TYPE", reviewer_user_id: booking.guestid },
      { booking_id: booking.id, review_type: "GUEST_TO_PROPERTY", reviewer_user_id: "another-user" },
    ];
    repository.findReviewByBookingTypeAndReviewer.mockImplementation(async (key) =>
      reviews.find((review) => Object.entries(key).every(([field, value]) => review[field] === value)) || null);
    await expect(service.createReview(booking.guestid, payload)).resolves.toMatchObject({ review_type: "GUEST_TO_PROPERTY" });
    // This tests key isolation, without introducing a new supported creation type.
  });

  it("handles wrapped PostgreSQL composite uniqueness errors", async () => {
    repository.create.mockRejectedValue({ driverError: { code: "23505",
      constraint: "review_booking_type_reviewer_unique_test" } });
    await expect(service.createReview(booking.guestid, payload)).rejects.toMatchObject({ statusCode: 409 });
  });

  it("does not disguise unrelated database errors as duplicate reviews", async () => {
    const error = { code: "23505", constraint: "review_id_unique" };
    repository.create.mockRejectedValue(error);
    await expect(service.createReview(booking.guestid, payload)).rejects.toBe(error);
  });

  it.each([undefined, null, "", " ", 12, "x".repeat(121)])("requires a valid title: %p", async (title) => {
    await expect(service.createReview(booking.guestid, { ...payload, title })).rejects.toMatchObject({ statusCode: 400 });
    expect(repository.findBookingById).not.toHaveBeenCalled();
  });

  it.each([undefined, null, "", " ", 12])("requires public review text: %p", async (public_review) => {
    await expect(service.createReview(booking.guestid, { ...payload, public_review })).rejects.toMatchObject({ statusCode: 400 });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("normalizes text and generates an application review ID", async () => {
    await service.createReview(booking.guestid, { ...payload, title: " Stay ", public_review: " Good ", private_feedback: " Host only " });
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/), title: "Stay", public_review: "Good", private_feedback: "Host only",
    }), {});
  });

  it("validates category ratings against active categories for the established type", async () => {
    await service.createReview(booking.guestid, { ...payload, category_ratings: { cleanliness: 4.5 } });
    expect(repository.findActiveCategoryKeys).toHaveBeenCalledWith("GUEST_TO_PROPERTY");
    expect(repository.create).toHaveBeenCalledWith(expect.any(Object), { cleanliness: 4.5 });
    repository.create.mockClear();
    await expect(service.createReview(booking.guestid, { ...payload, category_ratings: { unsupported: 5 } }))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it.each([null, [], { cleanliness: 0 }, { cleanliness: 6 }, { cleanliness: "5" }])(
    "rejects invalid category ratings: %p", async (category_ratings) => {
      await expect(service.createReview(booking.guestid, { ...payload, category_ratings })).rejects.toMatchObject({ statusCode: 400 });
      expect(repository.create).not.toHaveBeenCalled();
    }
  );
});

describe('Review workflows', () => {
  const now = 1790000000000;
  const draft = { id: "r1", booking_id: "b1", property_id: "p1", host_id: "host", reviewer_user_id: "guest",
    reviewee_user_id: "host", review_type: "GUEST_TO_PROPERTY", status: "DRAFT", publication_status: "UNPUBLISHED",
    verification_status: "UNVERIFIED", overall_rating: 4, title: "Stay", public_review: "Good",
    private_feedback: "secret", created_at: now - 10, updated_at: now - 10 };
  const published = { ...draft, status: "PUBLISHED", publication_status: "PUBLISHED" };
  const event = (userId = "guest", body) => ({ pathParameters: { id: "r1" },
    requestContext: { authorizer: { claims: { sub: userId } } }, body: body === undefined ? undefined : JSON.stringify(body) });
  let repository;
  let service;
  let controller;

  beforeEach(() => {
    repository = {
      findById: jest.fn().mockResolvedValue({ ...draft }),
      findForUser: jest.fn().mockResolvedValue([draft, { ...published, id: "received", reviewer_user_id: "other", reviewee_user_id: "guest" }]),
      findActiveCategoryKeys: jest.fn().mockResolvedValue(new Set(["cleanliness"])),
      updateDraft: jest.fn().mockImplementation(async ({ fields }) => ({ ...draft, ...fields })),
      findPublicForProperty: jest.fn().mockResolvedValue([published]),
      findBookingById: jest.fn().mockResolvedValue({ id: "b1", guestid: "guest", hostid: "host", property_id: "p1",
        status: "Paid", departuredate: now - 100 }),
      publishDraft: jest.fn().mockResolvedValue(published),
    };
    service = new ReviewService({ repository, now: () => now });
    controller = new Controller({ service });
  });

  it.each(["written", "received"])("scopes %s dashboard reads and excludes private feedback", async (scope) => {
    const response = await controller.getReviews({ ...event(), queryStringParameters: { scope, userId: "spoof" } });
    expect(response.statusCode).toBe(200);
    const reviews = JSON.parse(response.body);
    expect(reviews).toHaveLength(1);
    expect(reviews[0].id).toBe(scope === "written" ? "r1" : "received");
    expect(reviews[0]).toMatchObject({ rating: 4, content: "Good", date: draft.created_at });
    expect(response.body).not.toContain("secret");
  });

  it("allows authors to read drafts but hides them from other users", async () => {
    expect((await controller.getReviewById(event())).statusCode).toBe(200);
    expect((await controller.getReviewById(event("host"))).statusCode).toBe(404);
    repository.findById.mockResolvedValue(published);
    const response = await controller.getReviewById(event("other"));
    expect(response.statusCode).toBe(200);
    expect(response.body).not.toContain("secret");
  });

  it("serves public property reviews without caller identity or private fields", async () => {
    const response = await controller.getPropertyReviews({ pathParameters: { propertyId: "p1" } });
    expect(response.statusCode).toBe(200);
    expect(response.body).not.toMatch(/secret|private_feedback|reviewer_user_id|booking_id/);
  });

  it("validates path IDs before repository access", async () => {
    expect((await controller.getReviewById({ ...event(), pathParameters: {} })).statusCode).toBe(400);
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it("updates an author's draft with its expected version and normalizes text", async () => {
    const response = await controller.updateReview(event("guest", { title: " Better ", category_ratings: { cleanliness: 5 } }));
    expect(response.statusCode).toBe(200);
    expect(repository.updateDraft).toHaveBeenCalledWith(expect.objectContaining({ reviewerUserId: "guest",
      expectedUpdatedAt: draft.updated_at, fields: { title: "Better", updated_at: now }, categoryRatings: { cleanliness: 5 } }));
    expect(response.body).not.toContain("secret");
  });

  it.each([{ status: "PUBLISHED" }, { reviewer_user_id: "spoof" }, {}, { category_ratings: { unknown: 5 } }, { overall_rating: 6 }])(
    "rejects invalid draft edits: %p", async (changes) => {
      expect((await controller.updateReview(event("guest", changes))).statusCode).toBe(400);
      expect(repository.updateDraft).not.toHaveBeenCalled();
    });

  it("rejects edits by another user and edits after publication", async () => {
    expect((await controller.updateReview(event("host", { title: "Changed" }))).statusCode).toBe(403);
    repository.findById.mockResolvedValue(published);
    expect((await controller.updateReview(event("guest", { title: "Changed" }))).statusCode).toBe(409);
    expect(repository.updateDraft).not.toHaveBeenCalled();
  });

  it("returns conflict when the draft version changes", async () => {
    repository.updateDraft.mockResolvedValue(null);
    expect((await controller.updateReview(event("guest", { title: "Changed" }))).statusCode).toBe(409);
  });

  it("allows private feedback for the author and host and supports an explicit policy", async () => {
    expect((await controller.getPrivateFeedback(event("host"))).statusCode).toBe(200);
    expect((await controller.getPrivateFeedback(event("guest"))).statusCode).toBe(200);
    expect((await controller.getPrivateFeedback(event("other"))).statusCode).toBe(403);
    service.canReadPrivateFeedback = async ({ userId }) => userId === "staff";
    const response = await controller.getPrivateFeedback(event("staff"));
    expect(JSON.parse(response.body)).toEqual({ review_id: "r1", private_feedback: "secret" });
  });

  it("denies publishing another user's review", async () => {
    expect((await controller.publishReview(event("host"))).statusCode).toBe(403);
    expect(repository.publishDraft).not.toHaveBeenCalled();
  });

  it("publishes through the default controller", async () => {
    ReviewRepository.mockImplementation(() => repository);
    const defaultController = new Controller();
    try {
      expect((await defaultController.publishReview(event("other"))).statusCode).toBe(403);
      expect(repository.publishDraft).not.toHaveBeenCalled();
      const response = await defaultController.publishReview(event());
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toMatchObject({ status: "PUBLISHED", publication_status: "PUBLISHED" });
      expect(response.body).not.toContain("secret");
      const { authorize } = repository.publishDraft.mock.calls[0][0];
      expect(await authorize(draft)).toBe(true);
      expect(await authorize({ ...draft, reviewer_user_id: "other" })).toBe(false);
    } finally {
      ReviewRepository.mockReset();
    }
  });

  it("enforces private feedback ownership through the default controller", async () => {
    ReviewRepository.mockImplementation(() => repository);
    const defaultController = new Controller();
    try {
      for (const userId of ["guest", "host"]) {
        const response = await defaultController.getPrivateFeedback(event(userId));
        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual({ review_id: "r1", private_feedback: "secret" });
      }
      expect((await defaultController.getPrivateFeedback(event("other"))).statusCode).toBe(403);
      expect((await defaultController.getPrivateFeedback({})).statusCode).toBe(401);
    } finally {
      ReviewRepository.mockReset();
    }
  });

  it("publishes through the authorized transaction without claiming verified-stay evidence", async () => {
    service.canPublishReview = async ({ userId }) => userId === "staff";
    const response = await controller.publishReview(event("staff"));
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).verification_status).toBe("UNVERIFIED");
    const args = repository.publishDraft.mock.calls[0][0];
    expect(await args.authorize(draft)).toBe(true);
  });

  it("rechecks eligibility before publishing and reports concurrent changes", async () => {
    service.canPublishReview = async () => true;
    repository.findBookingById.mockResolvedValue({ guestid: "guest", hostid: "host", property_id: "p1",
      status: "Cancelled", departuredate: now - 100 });
    expect((await controller.publishReview(event())).statusCode).toBe(400);
    expect(repository.publishDraft).not.toHaveBeenCalled();
    repository.findBookingById.mockResolvedValue({ guestid: "guest", hostid: "host", property_id: "p1",
      status: "Paid", departuredate: now - 100 });
    repository.publishDraft.mockResolvedValue(null);
    expect((await controller.publishReview(event())).statusCode).toBe(409);
  });

  it.each(["getReviews", "getReviewById", "updateReview", "getPrivateFeedback", "saveHostResponse",
    "deleteReviewResponse", "publishReview"])("authenticates %s before accessing storage", async (action) => {
    expect((await controller[action]({})).statusCode).toBe(401);
    expect(repository.findById).not.toHaveBeenCalled();
    expect(repository.findForUser).not.toHaveBeenCalled();
  });
});
