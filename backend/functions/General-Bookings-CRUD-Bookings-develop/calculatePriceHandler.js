import CalculateTotalRate from "./util/calcuateTotalRate.js"; 

export const handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  let body;
  try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch (e) {
      console.error("JSON Parsing Error", e);
      return { 
          statusCode: 400, 
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: "Invalid JSON format" }) 
      };
  }

  if (!body) {
      return { 
          statusCode: 400, 
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: "No body provided" }) 
      };
  }

  const { propertyId, startDate, endDate } = body;

  if (!propertyId || !startDate || !endDate) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Missing required fields: propertyId, startDate, endDate" }),
    };
  }

  try {
    const dates = {
        arrivalDate: new Date(startDate), 
        departureDate: new Date(endDate)
    };

    const result = await CalculateTotalRate(propertyId, dates);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*", 
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        data: {
            totalPriceCents: result.totalWithCleaningfee,
            basePriceCents: result.totalWithoutCleaningfee,
            currency: "EUR"
        }
      }),
    };

  } catch (error) {
    console.error("Pricing Logic Error:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Error calculating price", error: error.message }),
    };
  }
};