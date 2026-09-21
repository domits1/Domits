import { CompanyProfileController } from "./controller/controller.js";

const controller = new CompanyProfileController();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,PUT,POST,OPTIONS",
};

const createLambdaResponse = (returnedResponse) => ({
  statusCode: returnedResponse?.statusCode || 200,
  headers: {
    ...corsHeaders,
    ...returnedResponse?.headers,
  },
  body: JSON.stringify(returnedResponse?.response),
});

export const handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 200, headers: corsHeaders, body: "" };
    }

    const action = event.queryStringParameters?.action;

    if (event.httpMethod === "GET") {
      return createLambdaResponse(await controller.getProfile(event));
    }

    if (event.httpMethod === "PUT") {
      return createLambdaResponse(await controller.updateProfile(event));
    }

    if (event.httpMethod === "POST" && action === "logo-upload-url") {
      return createLambdaResponse(await controller.createLogoUploadUrl(event));
    }

    return createLambdaResponse({
      statusCode: 404,
      response: { message: `Method ${event.httpMethod} not supported.` },
    });
  } catch (error) {
    if (error?.statusCode) {
      return createLambdaResponse({
        statusCode: error.statusCode,
        response: {
          error: error.code || "REQUEST_FAILED",
          message: error.message,
        },
      });
    }

    console.error("Company profile handler failed", error);
    return createLambdaResponse({
      statusCode: 500,
      response: {
        error: "INTERNAL_ERROR",
        message: "Internal Server Error",
      },
    });
  }
};
