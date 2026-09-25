import { handler } from "../../functions/PropertyHandler/index.js";

// Fill these in with a real booking and a real, currently-valid Cognito
// access token belonging to that booking's guest (authorizeBookingGuestRequest
// calls Cognito's GetUser with this token, so it can't be fabricated).
const BOOKING_ID = "e15d52f7-6765-4c3b-93c4-0aab7369e668";
const GUEST_ACCESS_TOKEN = "";

async function main() {
  const result = await handler({
    httpMethod: "GET",
    resource: "/property/bookingEngine/{subResource}",
    pathParameters: {
      subResource: "booking",
    },
    queryStringParameters: {
      bookingId: BOOKING_ID,
    },
    headers: {
      Authorization: GUEST_ACCESS_TOKEN,
    },
  });
  console.log("statusCode:", result.statusCode);
  const body = JSON.parse(result.body);
  console.log("amenities count:", Array.isArray(body?.amenities) ? body.amenities.length : body?.amenities);
  console.log("houseRules:", JSON.stringify(body?.houseRules));
  console.log("full body:", JSON.stringify(body, null, 2));
}

main();
