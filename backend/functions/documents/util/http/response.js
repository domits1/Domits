import responseHeaders from "../constant/responseHeader.json" with { type: "json" };

export const GENERIC_ERROR_MESSAGE = "Something went wrong, please contact support.";

export const respond = (statusCode, body) => ({
  statusCode,
  headers: responseHeaders,
  body: JSON.stringify(body),
});

const isClientError = (error) =>
  Number.isInteger(error?.statusCode) && error.statusCode >= 400 && error.statusCode < 500;

export const errorResponse = (error) => {
  if (isClientError(error)) {
    return respond(error.statusCode, { message: error.message });
  }
  console.error(error);
  return respond(500, { message: GENERIC_ERROR_MESSAGE });
};
