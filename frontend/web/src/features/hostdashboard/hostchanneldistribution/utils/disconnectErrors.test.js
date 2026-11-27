import { DISCONNECT_ERROR_MESSAGE, classifyDisconnectError } from "./disconnectErrors";

const requestError = (status, errorCode) => Object.assign(new Error("failed"), { status, responseBody: { errorCode } });

describe("classifyDisconnectError", () => {
  test.each([
    ["a 404 channel not found", requestError(404, "CHANNEL_NOT_FOUND"), true, ""],
    ["a 409 disconnect already in progress", requestError(409, "DISCONNECT_IN_PROGRESS"), true, ""],
    ["a 500 disconnect failure", requestError(500, "DISCONNECT_FAILED"), true, DISCONNECT_ERROR_MESSAGE],
    ["a 503 with no code", requestError(503, undefined), true, DISCONNECT_ERROR_MESSAGE],
    ["a 400", requestError(400, undefined), false, DISCONNECT_ERROR_MESSAGE],
    ["a 403", requestError(403, undefined), false, DISCONNECT_ERROR_MESSAGE],
  ])("%s", (_name, error, refresh, message) => {
    expect(classifyDisconnectError(error)).toEqual({ refresh, message });
  });

  test.each([
    ["a network error without a status", new Error("Failed to fetch")],
    ["nothing at all", undefined],
  ])("%s leaves the card alone and only tells the host", (_name, error) => {
    expect(classifyDisconnectError(error)).toEqual({ refresh: false, message: DISCONNECT_ERROR_MESSAGE });
  });
});
