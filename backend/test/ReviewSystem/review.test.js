jest.mock("../../functions/ReviewSystem/data/reviewRepository.js", () => ({
  ReviewRepository: jest.fn(),
}));

import { ReviewService } from "../../functions/ReviewSystem/business/service/reviewService.js";
import { AuthManager } from "../../functions/ReviewSystem/auth/authManager.js";
import { Controller } from "../../functions/ReviewSystem/controller/controller.js";

const now = Date.parse("2026-10-01T12:00:00Z");
const booking = {
  id: "reservation-1",
  guestid: "guest-1",
  property_id: "property-1",
  hostid: "host-1",
  status: "Paid",
  departuredate: now - 1000,
};
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
  };
  service = new ReviewService({ repository, now: () => now });
  authManager = new AuthManager();
  jest.spyOn(authManager, "getUser");
  controller = new Controller({ service, authManager });
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

it.each(["{", "null", "[]"])("rejects malformed review bodies: %s", async (body) => {
  const result = await controller.createReview({
    headers: { Authorization: "access-token" }, requestContext: { authorizer: { claims: { sub: booking.guestid } } },
    body,
  });
  expect(result.statusCode).toBe(400);
  expect(repository.create).not.toHaveBeenCalled();
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

