import ReservationController from "./controller/reservationController.js";
import ParseEvent from "./business/parseEvent.js"
import responsejson from "./util/const/responseheader.json" with { type: "json" };

const controller = new ReservationController();
const eventparser = new ParseEvent();
const responseHeaders = responsejson;

const getHttpMethod = (event) => event?.httpMethod || event?.requestContext?.http?.method;

const PUBLIC_SITE_BOOKINGS_RESOURCE = "/public/sites/{siteId}/bookings";
const PUBLIC_SITE_BOOKINGS_PATH_PATTERN = /\/public\/sites\/[^/]+\/bookings\/?$/;

const isPublicSiteBookingRequest = (event, httpMethod) =>
  httpMethod === "POST" &&
  (event?.resource === PUBLIC_SITE_BOOKINGS_RESOURCE || PUBLIC_SITE_BOOKINGS_PATH_PATTERN.test(String(event?.path || "")));

const buildPublicSiteBookingFailure = (event) => ({
  statusCode: 500,
  headers: responseHeaders,
  body: JSON.stringify({
    error: {
      code: "internal_error",
      message: "Something went wrong while sending your booking request. Please try again.",
      requestId: String(event?.requestContext?.requestId || ""),
    },
  }),
});

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

  if (isPublicSiteBookingRequest(event, httpMethod)) {
    try {
      return await controller.createPublicSiteBookingRequest(event);
    } catch (error) {
      console.error("Public site booking request failed before a response could be built.", error);
      return buildPublicSiteBookingFailure(event);
    }
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
