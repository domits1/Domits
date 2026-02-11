
import BookingRepository from "../../data/bookingRepository.js";
import AuthManager from "../../auth/authManager.js";

import { BadRequestException } from "../../util/exception/badRequestException.js";
import { NotFoundException } from "../../util/exception/NotFoundException.js";

const getAuth = (event) => event.headers.Authorization;

export default class StripePayoutsService {
  constructor() {
    this.authManager = new AuthManager();
    this.bookingRepository = new BookingRepository();
  }

  async getBookingByGuestId(event) {
    const token = getAuth(event);
    const { sub: cognitoUserId } = await this.authManager.authenticateUser(token);
    const testResponse = await this.bookingRepository.getBookingByGuestId(cognitoUserId);
    return testResponse;
  }
}