import { describe, expect, it, jest } from "@jest/globals";
import ReviewEligibilityService from "../../functions/ReviewSystem/business/service/reviewEligibilityService.js";

const NOW = Date.parse("2026-09-10T12:00:00.000Z");
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Builds a default booking with optional field overrides.
const createBooking = (overrides = {}) => ({
  id: "booking-1",
  guestid: "guest-1",
  hostid: "host-1",
  property_id: "property-1",
  status: "Completed",
  departuredate: NOW - ONE_DAY_MS,
  ...overrides,
});

// Builds a valid eligibility request with optional field overrides.
const eligibilityPayload = (overrides = {}) => ({
  bookingId: "booking-1",
  propertyId: "property-1",
  reviewType: "GUEST_TO_PROPERTY",
  reviewerUserId: "guest-1",
  ...overrides,
});

// Creates the service and its mocked repository dependencies.
const buildService = ({ repositoryOverrides = {} } = {}) => {
  const reviewRepository = {
    getBookingById: jest.fn().mockResolvedValue(createBooking()),
    getReviewByBookingTypeAndReviewer: jest.fn().mockResolvedValue(null),
    ...repositoryOverrides,
  };

  return {
    reviewRepository,
    service: new ReviewEligibilityService({
      reviewRepository,
      clock: () => NOW,
    }),
  };
};

// Covers reservation eligibility validation behavior.
describe("ReviewEligibilityService", () => {
  // Confirms an eligible reservation returns its booking and performs the expected lookups.
  it("returns the booking when the reservation is eligible", async () => {
    const { service, reviewRepository } = buildService();

    const booking = await service.validateReservationEligibility(eligibilityPayload());

    expect(booking).toEqual(createBooking());
    expect(reviewRepository.getBookingById).toHaveBeenCalledWith("booking-1");
    expect(reviewRepository.getReviewByBookingTypeAndReviewer).toHaveBeenCalledWith({
      bookingId: "booking-1",
      reviewType: "GUEST_TO_PROPERTY",
      reviewerUserId: "guest-1",
    });
  });

  // Confirms a booking identifier is required.
  it("rejects missing booking id", async () => {
    const { service } = buildService();

    await expect(
      service.validateReservationEligibility(eligibilityPayload({ bookingId: undefined }))
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "bookingId is required.",
    });
  });

  // Confirms a property identifier is required.
  it("rejects missing property id", async () => {
    const { service } = buildService();

    await expect(
      service.validateReservationEligibility(eligibilityPayload({ propertyId: undefined }))
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "propertyId is required.",
    });
  });

  // Confirms a review type is required.
  it("rejects missing review type", async () => {
    const { service } = buildService();

    await expect(
      service.validateReservationEligibility(eligibilityPayload({ reviewType: undefined }))
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "reviewType is required.",
    });
  });

  // Confirms the reviewer must be authenticated.
  it("rejects missing authenticated reviewer", async () => {
    const { service } = buildService();

    await expect(
      service.validateReservationEligibility(eligibilityPayload({ reviewerUserId: undefined }))
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "Authenticated reviewer is required.",
    });
  });

  // Confirms an unknown booking is rejected.
  it("rejects unknown bookings", async () => {
    const { service } = buildService({
      repositoryOverrides: {
        getBookingById: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(service.validateReservationEligibility(eligibilityPayload())).rejects.toMatchObject({
      statusCode: 404,
      message: "Booking not found.",
    });
  });

  // Confirms only the booking guest can submit a guest-to-property review.
  it("rejects users who are not the booking guest", async () => {
    const { service } = buildService();

    await expect(
      service.validateReservationEligibility(eligibilityPayload({ reviewerUserId: "other-user" }))
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "Only the guest of this booking can leave a review.",
    });
  });

  // Confirms the booking host can submit a host-to-guest review.
  it("allows the booking host to review the guest", async () => {
    const { service } = buildService();

    await expect(
      service.validateReservationEligibility(
        eligibilityPayload({ reviewType: "HOST_TO_GUEST", reviewerUserId: "host-1" })
      )
    ).resolves.toEqual(createBooking());
  });

  // Confirms guests cannot submit host-to-guest reviews.
  it("rejects a guest attempting to submit a host-to-guest review", async () => {
    const { service } = buildService();

    await expect(
      service.validateReservationEligibility(eligibilityPayload({ reviewType: "HOST_TO_GUEST" }))
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "Only the host of this booking can leave this review.",
    });
  });

  // Confirms unsupported review types are rejected.
  it("rejects unsupported review types", async () => {
    const { service } = buildService();

    await expect(
      service.validateReservationEligibility(eligibilityPayload({ reviewType: "UNKNOWN" }))
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "reviewType is not supported.",
    });
  });

  // Confirms the requested property must match the booking property.
  it("rejects property mismatch", async () => {
    const { service } = buildService();

    await expect(
      service.validateReservationEligibility(eligibilityPayload({ propertyId: "other-property" }))
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Review property does not match booking property.",
    });
  });

  // Confirms only completed bookings can be reviewed.
  it("rejects bookings that are not completed", async () => {
    const { service } = buildService({
      repositoryOverrides: {
        getBookingById: jest.fn().mockResolvedValue(createBooking({ status: "Paid" })),
      },
    });

    await expect(service.validateReservationEligibility(eligibilityPayload())).rejects.toMatchObject({
      statusCode: 403,
      message: "Only completed bookings can be reviewed.",
    });
  });

  // Confirms completed booking status matching is case-insensitive.
  it("accepts completed booking status case-insensitively", async () => {
    const { service } = buildService({
      repositoryOverrides: {
        getBookingById: jest.fn().mockResolvedValue(createBooking({ status: "COMPLETED" })),
      },
    });

    await expect(service.validateReservationEligibility(eligibilityPayload())).resolves.toEqual(
      createBooking({ status: "COMPLETED" })
    );
  });

  // Confirms reviews are unavailable before checkout.
  it("rejects stays before checkout", async () => {
    const { service } = buildService({
      repositoryOverrides: {
        getBookingById: jest.fn().mockResolvedValue(createBooking({ departuredate: NOW + ONE_DAY_MS })),
      },
    });

    await expect(service.validateReservationEligibility(eligibilityPayload())).rejects.toMatchObject({
      statusCode: 403,
      message: "You can review only after checkout.",
    });
  });

  // Confirms invalid checkout dates are rejected.
  it("rejects invalid checkout dates", async () => {
    const { service } = buildService({
      repositoryOverrides: {
        getBookingById: jest.fn().mockResolvedValue(createBooking({ departuredate: "not-a-date" })),
      },
    });

    await expect(service.validateReservationEligibility(eligibilityPayload())).rejects.toMatchObject({
      statusCode: 403,
      message: "You can review only after checkout.",
    });
  });

  // Confirms a review remains valid on the final day of its window.
  it("allows reviews on the last day of the review window", async () => {
    const { service } = buildService({
      repositoryOverrides: {
        getBookingById: jest.fn().mockResolvedValue(createBooking({ departuredate: NOW - 30 * ONE_DAY_MS })),
      },
    });

    await expect(service.validateReservationEligibility(eligibilityPayload())).resolves.toEqual(
      createBooking({ departuredate: NOW - 30 * ONE_DAY_MS })
    );
  });

  // Confirms reviews are rejected after the review window expires.
  it("rejects expired review windows", async () => {
    const { service } = buildService({
      repositoryOverrides: {
        getBookingById: jest.fn().mockResolvedValue(createBooking({ departuredate: NOW - 31 * ONE_DAY_MS })),
      },
    });

    await expect(service.validateReservationEligibility(eligibilityPayload())).rejects.toMatchObject({
      statusCode: 403,
      message: "The review window has expired.",
    });
  });

  // Confirms a reviewer cannot submit a duplicate review for the booking.
  it("rejects duplicate reviews", async () => {
    const { service } = buildService({
      repositoryOverrides: {
        getReviewByBookingTypeAndReviewer: jest.fn().mockResolvedValue({ id: "review-existing" }),
      },
    });

    await expect(service.validateReservationEligibility(eligibilityPayload())).rejects.toMatchObject({
      statusCode: 409,
      message: "You have already reviewed this booking.",
    });
  });
});
