import ReservationController from "./controller/reservationController.js";
import ParseEvent from "./business/parseEvent.js"
import responsejson from "./util/const/responseheader.json" with { type: "json" };

const controller = new ReservationController();
const eventparser = new ParseEvent();
const responseHeaders = responsejson;

const getHttpMethod = (event) => event?.httpMethod || event?.requestContext?.http?.method;

export const handler = async (event) => {
  let returnedResponse = {};
  const httpMethod = getHttpMethod(event);

  if (httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: responseHeaders,
      body: "",
    };
  }

  let parsedEvent = await eventparser.handleEvent(event);
  switch(httpMethod){
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
      throw new Error("DELETE method is not implemented.");
    default:
      throw new Error("Unable to determine request type. Please contact the Admin.");
  }

  return {
    statusCode: returnedResponse?.statusCode || 200,
    headers: returnedResponse?.headers || responseHeaders,
    body: JSON.stringify(returnedResponse?.response),
    //body: JSON.stringify(event), 
  };
};  
