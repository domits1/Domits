import responseHeaders from "../constant/responseHeader.json" with { type: "json" };

export const GENERIC_ERROR_MESSAGE = "Something went wrong, please contact support.";

export const respond = (statusCode, body) => ({
  statusCode,
  headers: responseHeaders,
  body: JSON.stringify(body),
});
