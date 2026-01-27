import ReservationController from "./controller/reservationController.js";
import ParseEvent from "./business/parseEvent.js";
import { handler as calculatePriceHandler } from "./calculatePriceHandler.js"; 

const controller = new ReservationController();
const eventparser = new ParseEvent();

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*", 
    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PATCH,DELETE"
  };

  if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: headers,
        body: JSON.stringify({ message: "CORS Allowed" }),
      };
  }

  let returnedResponse = {};

  try {
      let parsedEvent = null;
      try {
        parsedEvent = await eventparser.handleEvent(event);
      } catch (e) {
        console.warn("Event parsing warning:", e);
      }

      if (event.httpMethod === "POST" && parsedEvent && parsedEvent.action === "calculatePrice") {
          console.log("🚀 Redirecting to CalculatePriceHandler");
          const priceResponse = await calculatePriceHandler(event);
          
          return {
              ...priceResponse,
              headers: {
                  ...headers,
                  ...(priceResponse.headers || {})
              }
          };
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
          throw new Error(`Unsupported method "${event.httpMethod}"`);
      }

      return {
        statusCode: returnedResponse?.statusCode || 200,
        headers: {
            ...headers,
            ...(returnedResponse?.headers || {})
        },
        body: JSON.stringify(returnedResponse?.response),
      };

  } catch (error) {
      console.error("Handler Error:", error);
      return {
          statusCode: 500,
          headers: headers,
          body: JSON.stringify({ message: error.message })
      };
  }
};