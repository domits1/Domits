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
const payload = { reservation_id: booking.id, overall_rating: 5, public_review: "Great stay." };

let repository;
let service;
let controller;
let authManager;

describe("review editing", () => {
  const id = "12345678-1234-1234-1234-123456789abc";
  let existing;
  const changes = () => ({ overall_rating: 4, public_review: " Updated\r\nreview ", updated_at: now - 500 });
  beforeEach(() => {
    existing = { id, guest_id: booking.guestid, reservation_id: booking.id,
      property_id: booking.property_id, host_id: booking.hostid, created_at: now - 500,
      updated_at: now - 500, overall_rating: 5, public_review: "Original review" };
    repository.findReviewById = jest.fn(async () => existing);
    repository.updateEditableReview = jest.fn(async ({ overallRating, publicReview }) => {
      Object.assign(existing, { overall_rating: overallRating, public_review: publicReview, updated_at: now });
      return { affected: 1, updated_at: now };
    });
    service.editWindowMs = 1000;
  });
  test("loads existing fields and persists an authenticated PATCH without changing relationships", async () => {
    await expect(service.getEditableReview(booking.guestid, id)).resolves.toMatchObject({
      overall_rating: 5, public_review: "Original review", updated_at: now - 500,
    });
    const response = await controller.manageReviews({ httpMethod: "PATCH", headers: { Authorization: "token" },
      requestContext: { authorizer: { claims: { sub: booking.guestid } } },
      queryStringParameters: { reviewId: id }, body: JSON.stringify(changes()) });
    expect(response.statusCode).toBe(200);
    expect(existing).toMatchObject({ overall_rating: 4, public_review: "Updated\nreview", updated_at: now,
      guest_id: booking.guestid, reservation_id: booking.id, property_id: booking.property_id,
      host_id: booking.hostid, created_at: now - 500 });
    expect(repository.updateEditableReview).toHaveBeenCalledWith({ id, guestId: booking.guestid,
      previousUpdatedAt: now - 500, editWindowMs: 1000, now: expect.any(Function),
      overallRating: 4, publicReview: "Updated\nreview" });
  });
  test("loads an editable review through authenticated GET", async () => {
    const response = await controller.manageReviews({
      httpMethod: "GET", queryStringParameters: { reviewId: id },
      requestContext: { authorizer: { claims: { sub: booking.guestid } } },
    });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toMatchObject({ id, overall_rating: 5, updated_at: now - 500 });
    expect(repository.findReviewById).toHaveBeenCalledWith(id);
    expect(repository.findReviews).not.toHaveBeenCalled();
  });
  test.each(["other guest", "expired", "disabled", "future"])("rejects editing: %s", async (reason) => {
    if (reason === "expired") existing.created_at = now - 1000;
    if (reason === "future") existing.created_at = now + 1;
    if (reason === "disabled") service.editWindowMs = 0;
    await expect(service.updateReview(reason === "other guest" ? "guest-2" : booking.guestid, id, changes()))
      .rejects.toMatchObject({ statusCode: 403 });
    expect(repository.updateEditableReview).not.toHaveBeenCalled();
  });
  test.each([{ overall_rating: 0 }, { overall_rating: 6 }, { overall_rating: 1.5 },
    { public_review: "" }, { public_review: "x".repeat(501) }, { public_review: "\u0000" },
    { guest_id: "guest-2" }, { reservation_id: "other" }, { updated_at: "invalid" }])("rejects invalid edits: %j", async (invalid) => {
    await expect(service.updateReview(booking.guestid, id, { ...changes(), ...invalid }))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(repository.updateEditableReview).not.toHaveBeenCalled();
  });
  test("rejects stale versions and writes losing the atomic check", async () => {
    existing.updated_at++;
    await expect(service.updateReview(booking.guestid, id, changes())).rejects.toMatchObject({ statusCode: 409 });
    existing.updated_at--;
    repository.updateEditableReview.mockResolvedValue({ affected: 0 });
    await expect(service.updateReview(booking.guestid, id, changes())).rejects.toMatchObject({ statusCode: 409 });
  });
  test("marks only eligible written reviews editable", async () => {
    repository.findReviews.mockResolvedValue([existing]);
    expect((await service.getReviews(booking.guestid))[0].can_edit).toBe(true);
    expect((await service.getReviews(booking.guestid, "received"))[0].can_edit).toBe(false);
    existing.created_at = now - 1000;
    expect((await service.getReviews(booking.guestid))[0].can_edit).toBe(false);
    existing.created_at = now + 1;
    expect((await service.getReviews(booking.guestid))[0].can_edit).toBe(false);
    existing.created_at = now - 500;
    service.editWindowMs = 0;
    expect((await service.getReviews(booking.guestid))[0].can_edit).toBe(false);
  });
});

it.each([undefined, null, "", " \n\t ", 42, true, {}, [], "x".repeat(501), "Stay\u0000"])(
  "rejects invalid written content before persistence: %p", async (public_review) => {
    const response = await controller.createReview({
      headers: { Authorization: "token" }, body: JSON.stringify({ ...payload, public_review }),
      requestContext: { authorizer: { claims: { sub: booking.guestid } } },
    });
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toBeTruthy();
    expect(repository.findBookingById).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  }
);

it.each([
  ["x", "x"], ["x".repeat(500), "x".repeat(500)],
  ["  Quiet room.\r\nBusy street.\rGood transport.  ", "Quiet room.\nBusy street.\nGood transport."],
  ["Café 😊 — 5 < 10 & O'Brien's room", "Café 😊 — 5 < 10 & O'Brien's room"],
  ["<script>alert('test')</script>", "<script>alert('test')</script>"],
])("stores normalized plain text with verified booking identities: %p", async (input, expected) => {
  const saved = await service.createReview(booking.guestid, {
    ...payload, public_review: input, guest_id: "spoof", property_id: "spoof",
  });
  expect(saved.public_review).toBe(expected);
  expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
    public_review: expected, reservation_id: booking.id, guest_id: booking.guestid,
    property_id: booking.property_id, host_id: booking.hostid,
  }));
});

beforeEach(() => {
  repository = {
    findBookingById: jest.fn().mockResolvedValue({ ...booking }),
    create: jest.fn().mockImplementation(async (record) => record),
    findReviews: jest.fn().mockResolvedValue([]),
    deleteOwnReview: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  service = new ReviewService({ repository, now: () => now });
  authManager = new AuthManager();
  jest.spyOn(authManager, "getUser");
  controller = new Controller({ service, authManager });
});

it("uses booking identities instead of client-supplied identities", async () => {
  await service.createReview(booking.guestid, {
    ...payload,
    guest_id: "spoof",
    property_id: "spoof",
    host_id: "spoof",
  });
  expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
    guest_id: booking.guestid,
    property_id: booking.property_id,
    host_id: booking.hostid,
    reservation_id: booking.id,
    publication_status: "draft",
  }));
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
    constraint: "review_reservation_unique_idx",
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
  repository.create.mockImplementation(async (record) => ({ id: "review-1", ...record }));
  const result = await controller.createReview({
    headers: { Authorization: "access-token" }, requestContext: { authorizer: { claims: { sub: booking.guestid } } }, body: JSON.stringify({ ...payload, overall_rating }),
  });
  expect(result.statusCode).toBe(201);
  expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
    reservation_id: booking.id, guest_id: booking.guestid, overall_rating,
  }));
  expect(JSON.parse(result.body)).toEqual(expect.objectContaining({
    id: "review-1", reservation_id: booking.id, overall_rating,
  }));
});

it.each(["written", "received"])("scopes %s reviews to the authenticated caller", async (scope) => {
  repository.findReviews.mockResolvedValue([{ id: "review-1", overall_rating: 4, public_review: "Great stay.", created_at: now }]);
  const result = await controller.manageReviews({ httpMethod: "GET", headers: { Authorization: "token" }, requestContext: { authorizer: { claims: { sub: booking.guestid } } },
    queryStringParameters: { scope, guest_id: "spoof", host_id: "spoof" } });
  expect(result.statusCode).toBe(200);
  expect(repository.findReviews).toHaveBeenCalledWith(scope === "written" ? { guest_id: booking.guestid }
    : { host_id: booking.guestid, publication_status: "published" });
  expect(JSON.parse(result.body)[0]).toMatchObject({ id: "review-1", rating: 4, content: "Great stay.", date: now });
});

it.each(["GET", "DELETE", "PATCH"])("requires authentication for %s", async (httpMethod) => {
  expect((await controller.manageReviews({ httpMethod, headers: {} })).statusCode).toBe(401);
  expect(repository.findReviews).not.toHaveBeenCalled();
  expect(repository.deleteOwnReview).not.toHaveBeenCalled();
});

it("rejects unsupported scopes", async () => {
  await expect(service.getReviews(booking.guestid, "all")).rejects.toMatchObject({ statusCode: 400 });
  expect(repository.findReviews).not.toHaveBeenCalled();
});

it("deletes only an authored review and returns 404 when ownership does not match", async () => {
  const reviewId = "12345678-1234-1234-1234-123456789abc";
  const event = { httpMethod: "DELETE", headers: { Authorization: "token" }, requestContext: { authorizer: { claims: { sub: booking.guestid } } }, queryStringParameters: { reviewId } };
  expect((await controller.manageReviews(event)).statusCode).toBe(204);
  expect(repository.deleteOwnReview).toHaveBeenCalledWith(reviewId, booking.guestid);
  repository.deleteOwnReview.mockResolvedValue({ affected: 0 });
  expect((await controller.manageReviews(event)).statusCode).toBe(404);
});

it.each([undefined, "", "invalid"])("rejects invalid deletion ID: %p", async (id) => {
  await expect(service.deleteReview(booking.guestid, id)).rejects.toMatchObject({ statusCode: 400 });
  expect(repository.deleteOwnReview).not.toHaveBeenCalled();
});
