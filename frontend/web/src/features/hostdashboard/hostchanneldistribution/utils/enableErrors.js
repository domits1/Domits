// What to do when enableDistribution fails (design note #3954, D2). The error codes are PROPOSED,
// TO CONFIRM WITH ENES; the statuses are the ones the backend answers with.
//
// An error the backend answered (409, 400, 422, 5xx) means the listing may have changed on the other
// side, so the caller reads it again and the refreshed listing explains itself: "Setting up…" for a
// 409, what is missing for a 422, the setup-failed notice for a failure that was stored. Anything
// else (no answer at all, or a status that says nothing about the listing) leaves the listing as it
// is and only tells the host.

export const ENABLE_ERROR_MESSAGE = "We couldn't set up this listing. Try again.";
export const TIMEZONE_REQUIRED_MESSAGE = "Choose a timezone to continue.";

const NO_MESSAGE = "";
const STATUS_BAD_REQUEST = 400;
const STATUS_CONFLICT = 409;
const STATUS_UNPROCESSABLE = 422;
const STATUS_SERVER_ERROR = 500;

// Returns { refresh, message }: whether to read the listing again, and the sentence for the host
// ("" when the refreshed listing says enough).
export function classifyEnableError(error) {
  const status = error?.status;

  if (status === STATUS_CONFLICT || status === STATUS_UNPROCESSABLE) {
    return { refresh: true, message: NO_MESSAGE };
  }
  if (status === STATUS_BAD_REQUEST) {
    const message =
      error?.responseBody?.errorCode === "TIMEZONE_REQUIRED" ? TIMEZONE_REQUIRED_MESSAGE : ENABLE_ERROR_MESSAGE;
    return { refresh: true, message };
  }
  if (status >= STATUS_SERVER_ERROR) {
    return { refresh: true, message: ENABLE_ERROR_MESSAGE };
  }
  return { refresh: false, message: ENABLE_ERROR_MESSAGE };
}
