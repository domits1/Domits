import { BadRequestException } from "../util/exception/badRequestException.js";
import { ForbiddenException } from "../util/exception/forbiddenException.js";
import { NotFoundException } from "../util/exception/notFoundException.js";
import { ConflictException } from "../util/exception/conflictException.js";

export const isPublished = (review) => review.status === "PUBLISHED" && review.publication_status === "PUBLISHED";

// Validate that a reservation can legally receive a guest review.
// This prevents invalid submissions and preserves the guest-only review authorization rules.
export const assertEligibleBooking = (booking, userId, now) => {
  if (!booking) throw new NotFoundException("Reservation not found.");
  if (String(booking.guestid) !== String(userId)) {
    throw new ForbiddenException("You can only review your own reservation.");
  }
  if (String(booking.hostid) === String(userId)) {
    throw new ForbiddenException("You cannot review your own property.");
  }
  if (!["paid", "confirmed"].includes(String(booking.status ?? "").trim().toLowerCase())) {
    throw new BadRequestException("Only paid or confirmed reservations can be reviewed.");
  }
  const checkoutAt = Number(booking.departuredate);
  if (!Number.isFinite(checkoutAt) || checkoutAt <= 0 || checkoutAt > now) {
    throw new BadRequestException("You can only review a reservation after checkout.");
  }
};

// Validate that the host is allowed to manage a review response.
// This enforces ownership and publication rules before any response is created or edited.
export const assertHostResponseAccess = (review, userId) => {
  if (!review || ["DELETED", "REJECTED"].includes(review.status)) {
    throw new NotFoundException("Review not found.");
  }
  if (String(review.host_id) !== userId) {
    throw new ForbiddenException("Only the reviewed property's host can manage responses.");
  }
  if (!isPublished(review)) throw new ConflictException("Responses require a published review.");
};
