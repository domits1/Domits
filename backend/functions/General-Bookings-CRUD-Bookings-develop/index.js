import ReservationController from "./controller/reservationController.js";
import ParseEvent from "./business/parseEvent.js"
import { handler as calculatePriceHandler } from "./calculatePriceHandler.js"; 

const controller = new ReservationController();
const eventparser = new ParseEvent();

export const handler = async (event) => {
  let returnedResponse = {};
  
  let parsedEvent = await eventparser.handleEvent(event);

  if (event.httpMethod === "POST" && parsedEvent && parsedEvent.action === "calculatePrice") {
      console.log("🚀 Intercepted Pricing Request - Redirecting to CalculatePriceHandler");
      return await calculatePriceHandler(event);
  }

  switch(event.httpMethod){
    case "POST":
      returnedResponse = await controller.create(parsedEvent);
      break;
    case "GET":
      returnedResponse = await controller.read(parsedEvent);
      break;
    case "PATCH":
      returnedResponse = await controller.patch(event);
      break;
    case "DELETE":
      console.log("DELETE request called");
      break;
    default:
      throw new Error("Unable to determine request type. Please contact the Admin.");
  }

  return {
    statusCode: returnedResponse?.statusCode || 200,
    headers: returnedResponse?.headers || null,
    body: JSON.stringify(returnedResponse?.response),
  };
};