import { classifyListingError, errorCodeOf } from "./listingErrors";

export const CONNECT_ERROR_MESSAGE = "We couldn't start the connection. Try again.";

const CONNECT_SESSION_ERRORS = {
  DISTRIBUTION_NOT_TURNED_ON: { reread: true, message: "This listing isn't turned on yet." },
};

// What to do when the connect session cannot be created: the sentence for the host and whether to
// read the listings again. DISTRIBUTION_CONNECT_SESSION_FAILED and anything unknown, including a
// request that got no answer, only tell the host to try again.
export function classifyConnectSessionError(error) {
  const known = classifyListingError(error) ?? CONNECT_SESSION_ERRORS[errorCodeOf(error)];
  return known ?? { reread: false, message: CONNECT_ERROR_MESSAGE };
}
