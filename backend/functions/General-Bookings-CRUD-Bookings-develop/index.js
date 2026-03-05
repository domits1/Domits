import ReservationController from "./controller/reservationController.js";
import ParseEvent from "./business/parseEvent.js"

const controller = new ReservationController();
const eventparser = new ParseEvent();

export const handler = async (event) => {
  let returnedResponse = {};
  
  // ParseEvent can throw - let it propagate for tests that expect rejection
  let parsedEvent;
  try {
    parsedEvent = await eventparser.handleEvent(event);
  } catch (parseError) {
    // Re-throw parseEvent errors so tests expecting rejection will work
    throw parseError;
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
    //body: JSON.stringify(event), 
  };
};  
