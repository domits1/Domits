// What to do when disconnectChannel fails (design note #3954, D5). The error codes are PROPOSED, TO
// CONFIRM WITH ENES; the decision is by status, like utils/enableErrors.js.
//
// A 404 (the channel is gone) or a 409 (a disconnect is already running) says the listing changed on
// the other side, so the caller reads it again and the refreshed card explains itself: "Not connected"
// or "Disconnecting…". A 5xx may have left the channel in "Needs attention", so it also reads the
// listing again, and the host is told it failed. Anything else (no answer at all, or a status that
// says nothing about the channel) leaves the card as it is and only tells the host.

export const DISCONNECT_ERROR_MESSAGE = "We couldn't turn this off. Try again.";

const NO_MESSAGE = "";
const STATUS_NOT_FOUND = 404;
const STATUS_CONFLICT = 409;
const STATUS_SERVER_ERROR = 500;

// Returns { refresh, message }: whether to read the listing again, and the sentence for the host
// ("" when the refreshed card says enough).
export function classifyDisconnectError(error) {
  const status = error?.status;

  if (status === STATUS_NOT_FOUND || status === STATUS_CONFLICT) {
    return { refresh: true, message: NO_MESSAGE };
  }
  if (status >= STATUS_SERVER_ERROR) {
    return { refresh: true, message: DISCONNECT_ERROR_MESSAGE };
  }
  return { refresh: false, message: DISCONNECT_ERROR_MESSAGE };
}
