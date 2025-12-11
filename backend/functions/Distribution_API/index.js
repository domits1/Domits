const INTERNAL_BASE_URL =
  "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default";

export const handler = async (event) => {
  try {
    const propertyId =
      event?.queryStringParameters?.propertyId ??
      event?.queryStringParameters?.property;   

    if (!propertyId) {
      return jsonResponse(400, {
        error: "Missing required query parameter: ?propertyId=<propertyId>",
      });
    }

    const internalUrl = `${INTERNAL_BASE_URL}/property/bookingEngine/listingDetails?property=${encodeURIComponent(
      propertyId
    )}`;

    const internalResponse = await fetch(internalUrl);
    const internalData = await internalResponse.json();

    if (!internalResponse.ok) {
      return jsonResponse(internalResponse.status, {
        error: "Internal listing engine error",
        details: internalData,
      });
    }

    return jsonResponse(200, internalData);
  } catch (err) {
    console.error("Unexpected error:", err);

    return jsonResponse(500, {
      error: "Unexpected server error",
    });
  }
};

function jsonResponse(statusCode, obj) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(obj),
  };
}
