jest.mock("../../functions/ReviewSystem/data/reviewRepository.js", () => ({
  ReviewRepository: jest.fn(),
}));
jest.mock("../../functions/ReviewSystem/auth/authManager.js", () => ({
  AuthManager: jest.fn(),
}));

import { ReviewService } from "../../functions/ReviewSystem/business/service/reviewService.js";
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
const payload = { reservation_id: booking.id, overall_rating: 5 };

let repository;
let service;
let controller;
let authManager;

beforeEach(() => {
  repository = {
    findBookingById: jest.fn().mockResolvedValue({ ...booking }),
    create: jest.fn().mockImplementation(async (record) => record),
  };
  service = new ReviewService({ repository, now: () => now });
  authManager = {
    getUser: jest.fn(async (token) => {
      if (!token) {
        throw Object.assign(new Error("Missing token"), { statusCode: 401 });
      }
      return { userId: booking.guestid };
    }),
  };
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
    body: JSON.stringify(payload),
  });
  expect(result.statusCode).toBe(201);
  expect(authManager.getUser).toHaveBeenCalledWith("access-token");
});

it("rejects a missing authorization token", async () => {
  const result = await controller.createReview({ headers: {}, body: JSON.stringify(payload) });
  expect(result.statusCode).toBe(401);
  expect(repository.create).not.toHaveBeenCalled();
});

it.each(["{", "null", "[]"])("rejects malformed review bodies: %s", async (body) => {
  const result = await controller.createReview({
    headers: { Authorization: "access-token" },
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
    headers: { Authorization: "access-token" }, body: JSON.stringify({ ...payload, overall_rating }),
  });
  expect(result.statusCode).toBe(400);
  expect(JSON.parse(result.body).message).toBe("Please select an overall experience rating from 1 to 5 stars.");
});

it.each([0, 6, 2.5, "5"])("rejects an invalid rating through HTTP: %p", async (overall_rating) => {
  const result = await controller.createReview({
    headers: { Authorization: "access-token" }, body: JSON.stringify({ ...payload, overall_rating }),
  });
  expect(result.statusCode).toBe(400);
  expect(repository.create).not.toHaveBeenCalled();
});

it.each([1, 2, 3, 4, 5])("saves and returns %s stars for the correct review", async (overall_rating) => {
  repository.create.mockImplementation(async (record) => ({ id: "review-1", ...record }));
  const result = await controller.createReview({
    headers: { Authorization: "access-token" }, body: JSON.stringify({ ...payload, overall_rating }),
  });
  expect(result.statusCode).toBe(201);
  expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
    reservation_id: booking.id, guest_id: booking.guestid, overall_rating,
  }));
  expect(JSON.parse(result.body)).toEqual(expect.objectContaining({
    id: "review-1", reservation_id: booking.id, overall_rating,
  }));
});
