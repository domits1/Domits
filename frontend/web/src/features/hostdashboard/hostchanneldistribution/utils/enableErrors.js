import { classifyListingError, errorCodeOf } from "./listingErrors";

// What to do when enableDistribution fails (Enes's contract). The code decides, not the status: 409
// and 422 and 503 each carry several meanings. `reread` says whether to read the listings again,
// because the listing may have changed, and the refreshed listing then explains itself ("Setting up
// your listing…" for a setup that did not finish, what is missing for a listing that is not ready).
// The message is "" where the refreshed listing says enough. validationDetails of a refused setup
// are for engineers and never shown.

export const ENABLE_ERROR_MESSAGE = "We couldn't set up this listing. Try again.";
export const TIMEZONE_REQUIRED_MESSAGE = "Choose a timezone to continue.";

const ENABLE_ERRORS = {
  DISTRIBUTION_LISTING_NOT_READY: { reread: true, message: "" },
  DISTRIBUTION_TIMEZONE_CHOICE_NEEDED: { reread: true, message: TIMEZONE_REQUIRED_MESSAGE },
  DISTRIBUTION_TIMEZONE_INVALID_CHOICE: {
    reread: true,
    message: "That timezone isn't available for this listing. Choose another.",
  },
  DISTRIBUTION_TIMEZONE_UNKNOWN_COUNTRY: {
    reread: false,
    message: "We couldn't work out this listing's timezone. Contact support.",
  },
  DISTRIBUTION_ALREADY_IN_PROGRESS: { reread: true, message: "" },
  DISTRIBUTION_TRY_AGAIN: { reread: true, message: "Setting up didn't finish. Try again." },
  DISTRIBUTION_CHANNEX_REFUSED: { reread: true, message: "Channex couldn't set up this listing. Contact support." },
  DISTRIBUTION_NEEDS_ATTENTION: { reread: true, message: "This listing needs help from Domits. Contact support." },
  // Nothing about the listing changed, so there is nothing to read again.
  DISTRIBUTION_OWN_CHANNEX_ACCOUNT: {
    reread: false,
    message: "This listing is linked to your own Channex account. Contact support.",
  },
  DISTRIBUTION_NOT_CONFIGURED: { reread: false, message: "Distribution isn't available right now." },
};

const STATUS_SERVER_ERROR = 500;

// An unknown code, or no code, only tells the host to try again. A server error may have left the
// listing half set up, so it is read again; anything else says nothing about the listing.
export function classifyEnableError(error) {
  const known = classifyListingError(error) ?? ENABLE_ERRORS[errorCodeOf(error)];
  if (known) return known;
  return { reread: error?.status >= STATUS_SERVER_ERROR, message: ENABLE_ERROR_MESSAGE };
}
