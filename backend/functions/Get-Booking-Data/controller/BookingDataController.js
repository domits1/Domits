import responsejson from "../util/constant/responseHeader.json" with { type: 'json' };
import BookingDataService from "../business/service/BookingDataService.js";
import AuthManager from "../auth/authManager.js";

const responseHeaderJSON = responsejson;

export default class BookingDataController {
  constructor() {
    this.bookingDataService = new BookingDataService();
    this.authManager = new AuthManager();
  }

      async getBookingByGuestId(event) {
    try {
      const response = await this.bookingDataService.getBookingByGuestId(event);

      return {
        statusCode: response.statusCode || 200,
        headers: responseHeaderJSON,
        response: {
          message: response,
          details: response,
        },
      };
    } catch (error) {
      return {
        statusCode: error.statusCode || 500,
        headers: responseHeaderJSON,
        response: { 
          message: error.message || "Something went wrong, please contact support." 
        },
      };
    }
  }
}
