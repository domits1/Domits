import { describe, it, expect, jest } from "@jest/globals";
import { AuthManager } from "../../functions/PropertyHandler/auth/authManager.js";
import { NotFoundException } from "../../functions/PropertyHandler/util/exception/NotFoundException.js";
import { Forbidden } from "../../functions/PropertyHandler/util/exception/Forbidden.js";

const buildAuthManager = ({ user, booking }) => {
  const authManager = new AuthManager();
  authManager.cognitoRepository = {
    getUserByAccessToken: jest.fn(async () => user),
  };
  authManager.bookingRepository = {
    getBookingById: jest.fn(async () => booking),
  };
  return authManager;
};

describe("AuthManager.authorizeBookingGuestRequest", () => {
  it("throws NotFoundException when the booking does not exist", async () => {
    const authManager = buildAuthManager({
      user: { Username: "guest-1" },
      booking: null,
    });

    await expect(authManager.authorizeBookingGuestRequest("token", "missing-booking")).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it("throws Forbidden when the caller is not the booking's guest", async () => {
    const authManager = buildAuthManager({
      user: { Username: "guest-1" },
      booking: { guestId: "guest-2", status: "Paid", property_id: "property-1" },
    });

    await expect(authManager.authorizeBookingGuestRequest("token", "booking-1")).rejects.toBeInstanceOf(Forbidden);
  });

  it("resolves without throwing when the caller is the booking's guest", async () => {
    const authManager = buildAuthManager({
      user: { Username: "guest-1" },
      booking: { guestId: "guest-1", status: "Paid", property_id: "property-1" },
    });

    await expect(authManager.authorizeBookingGuestRequest("token", "booking-1")).resolves.toBeUndefined();
  });
});
