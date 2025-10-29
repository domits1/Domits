import BookingDataController from "./controller/BookingDataController.js";

const controller = new BookingDataController();

export const handler = async (event) => {
  const { path, httpMethod } = event;
  let returnedResponse = {};

  switch (true) {
    case httpMethod === "GET" && path === "/get-booking-by-guestid":
      returnedResponse = await controller.getBookingByGuestId(event);
      break;
    default:
      throw new Error("Unable to determine request type. Please contact the Admin.");
  }

  return {
    statusCode: returnedResponse?.statusCode || 200,
    headers: returnedResponse?.headers || {},
    body: JSON.stringify(returnedResponse?.response),
  };
};