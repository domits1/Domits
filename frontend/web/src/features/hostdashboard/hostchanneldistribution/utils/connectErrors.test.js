import { CONNECT_ERROR_MESSAGE, classifyConnectSessionError } from "./connectErrors";

const answered = (status, errorCode) =>
  Object.assign(new Error(`failed with status ${status}`), { status, responseBody: { errorCode } });

const NOT_FOUND = "We couldn't find this listing.";
const NOT_OWNED = "You don't have access to this listing.";
const NOT_TURNED_ON = "This listing isn't turned on yet.";

describe("classifyConnectSessionError", () => {
  test.each([
    ["a listing that is not found", answered(404, "DISTRIBUTION_LISTING_NOT_FOUND"), true, NOT_FOUND],
    ["a listing that is not the host's", answered(403, "DISTRIBUTION_LISTING_NOT_OWNED"), false, NOT_OWNED],
    ["a listing that is not turned on", answered(409, "DISTRIBUTION_NOT_TURNED_ON"), true, NOT_TURNED_ON],
    ["a failed connect session", answered(502, "DISTRIBUTION_CONNECT_SESSION_FAILED"), false, CONNECT_ERROR_MESSAGE],
  ])("%s", (_name, error, reread, message) => {
    expect(classifyConnectSessionError(error)).toEqual({ reread, message });
  });

  test.each([
    ["a 409 with another code", answered(409, "SOMETHING_ELSE")],
    ["a 404 with no code", answered(404, undefined)],
    ["a request that got no answer", new Error("Network request failed")],
    ["nothing at all", undefined],
  ])("decides by the code, so %s only says to try again", (_name, error) => {
    expect(classifyConnectSessionError(error)).toEqual({ reread: false, message: CONNECT_ERROR_MESSAGE });
  });
});
