import { ENABLE_ERROR_MESSAGE, TIMEZONE_REQUIRED_MESSAGE, classifyEnableError } from "./enableErrors";

const requestError = (status, errorCode) => Object.assign(new Error("failed"), { status, responseBody: { errorCode } });

const ZONE_NEEDED = TIMEZONE_REQUIRED_MESSAGE;
const NOT_FOUND = "We couldn't find this listing.";
const NOT_OWNED = "You don't have access to this listing.";
const INVALID_ZONE = "That timezone isn't available for this listing. Choose another.";
const UNKNOWN_COUNTRY = "We couldn't work out this listing's timezone. Contact support.";
const TRY_AGAIN = "Setting up didn't finish. Try again.";
const REFUSED = "Channex couldn't set up this listing. Contact support.";
const NEEDS_ATTENTION = "This listing needs help from Domits. Contact support.";
const NOT_CONFIGURED = "Distribution isn't available right now.";

describe("classifyEnableError", () => {
  test.each([
    ["a listing that is not found", requestError(404, "DISTRIBUTION_LISTING_NOT_FOUND"), true, NOT_FOUND],
    ["a listing that is not the host's", requestError(403, "DISTRIBUTION_LISTING_NOT_OWNED"), false, NOT_OWNED],
    ["a listing that is not ready", requestError(422, "DISTRIBUTION_LISTING_NOT_READY"), true, ""],
    ["a timezone that is needed", requestError(422, "DISTRIBUTION_TIMEZONE_CHOICE_NEEDED"), true, ZONE_NEEDED],
    ["an invalid timezone", requestError(422, "DISTRIBUTION_TIMEZONE_INVALID_CHOICE"), true, INVALID_ZONE],
    ["a country with no timezone", requestError(422, "DISTRIBUTION_TIMEZONE_UNKNOWN_COUNTRY"), false, UNKNOWN_COUNTRY],
    ["a setup already in progress", requestError(409, "DISTRIBUTION_ALREADY_IN_PROGRESS"), true, ""],
    ["a setup that needs a retry", requestError(503, "DISTRIBUTION_TRY_AGAIN"), true, TRY_AGAIN],
    ["a refusal by Channex", requestError(502, "DISTRIBUTION_CHANNEX_REFUSED"), true, REFUSED],
    ["a listing that needs attention", requestError(409, "DISTRIBUTION_NEEDS_ATTENTION"), true, NEEDS_ATTENTION],
    ["a backend that is not configured", requestError(503, "DISTRIBUTION_NOT_CONFIGURED"), false, NOT_CONFIGURED],
  ])("%s", (_name, error, reread, message) => {
    expect(classifyEnableError(error)).toEqual({ reread, message });
  });

  test.each([
    ["a 409 with an unknown code", requestError(409, "SOMETHING_NEW"), false],
    ["a 422 with an unknown code", requestError(422, "SOMETHING_NEW"), false],
    ["a 400", requestError(400, undefined), false],
    ["a 500 with no code", requestError(500, undefined), true],
    ["a 503 with an unknown code", requestError(503, "SOMETHING_NEW"), true],
  ])("decides by the code, so %s only says to try again", (_name, error, reread) => {
    expect(classifyEnableError(error)).toEqual({ reread, message: ENABLE_ERROR_MESSAGE });
  });

  test.each([
    ["a network error without a status", new Error("Failed to fetch")],
    ["nothing at all", undefined],
  ])("%s leaves the listing alone and only tells the host", (_name, error) => {
    expect(classifyEnableError(error)).toEqual({ reread: false, message: ENABLE_ERROR_MESSAGE });
  });
});
