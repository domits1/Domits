// import ReservationController from "./controller/reservationController.js";
// import ParseEvent from "./business/parseEvent.js"

// const controller = new ReservationController();
// const eventparser = new ParseEvent();

export const handler = async (event) => {
  console.log("🔥 Lambda started. Method:", event.httpMethod);

  const headers = {
    "Access-Control-Allow-Origin": "*", 
    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PATCH,DELETE"
  };

  if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: headers,
        body: JSON.stringify({ message: "CORS Allowed - Test Mode" }),
      };
  }

  try {
      let parsedBody = {};
      if (event.body) {
          try {
              parsedBody = JSON.parse(event.body);
          } catch (e) { console.error("Body parse error", e); }
      }

      if (event.httpMethod === "POST" && parsedBody && parsedBody.action === "calculatePrice") {
          console.log("🚀 Redirecting to CalculatePriceHandler");
          
          try {
              const module = await import("./calculatePriceHandler.js");
              const calculatePriceHandler = module.handler;
              
              const priceResponse = await calculatePriceHandler(event);
              
              return {
                  ...priceResponse,
                  headers: {
                      ...headers,
                      ...(priceResponse.headers || {})
                  }
              };
          } catch (importError) {
              console.error("❌ handler error:", importError);
              return {
                  statusCode: 500,
                  headers: headers,
                  body: JSON.stringify({ 
                      message: "Error loading CalculatePriceHandler", 
                      error: importError.message 
                  })
              };
          }
      }

      return {
          statusCode: 200,
          headers: headers,
          body: JSON.stringify({
              message: "Pricing API is working! Legacy Controller is disabled.",
              receivedAction: parsedBody.action
          })
      };

  } catch (error) {
      console.error("Global Handler Error:", error);
      return {
          statusCode: 500,
          headers: headers,
          body: JSON.stringify({ message: error.message })
      };
  }
};