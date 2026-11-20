import { ENABLE_ERROR_MESSAGE, TIMEZONE_REQUIRED_MESSAGE, classifyEnableError } from "./enableErrors";

const requestError = (status, errorCode) => Object.assign(new Error("failed"), { status, responseBody: { errorCode } });

describe("classifyEnableError", () => {
  test.each([
    ["a 409 already in progress", requestError(409, "PROVISIONING_IN_PROGRESS"), true, ""],
    ["a 422 listing not ready", requestError(422, "LISTING_NOT_READY"), true, ""],
    ["a 400 timezone required", requestError(400, "TIMEZONE_REQUIRED"), true, TIMEZONE_REQUIRED_MESSAGE],
    ["a 400 with another code", requestError(400, "SOMETHING_ELSE"), true, ENABLE_ERROR_MESSAGE],
    ["a 500 setup failure", requestError(500, "PROVISIONING_FAILED"), true, ENABLE_ERROR_MESSAGE],
    ["a 503 with no code", requestError(503, undefined), true, ENABLE_ERROR_MESSAGE],
    [
      "a 404 that says nothing about the listing's setup",
      requestError(404, "LISTING_NOT_FOUND"),
      false,
      ENABLE_ERROR_MESSAGE,
    ],
    ["a 403", requestError(403, undefined), false, ENABLE_ERROR_MESSAGE],
  ])("%s", (_name, error, refresh, message) => {
    expect(classifyEnableError(error)).toEqual({ refresh, message });
  });

  test.each([
    ["a network error without a status", new Error("Failed to fetch")],
    ["nothing at all", undefined],
  ])("%s leaves the listing alone and only tells the host", (_name, error) => {
    expect(classifyEnableError(error)).toEqual({ refresh: false, message: ENABLE_ERROR_MESSAGE });
  });
});
