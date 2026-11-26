// The two answers every host listing route can give about the listing itself (Enes's contract).
// Routes decide by errorCode, never by status alone: a status says little about the listing.
//
// `reread` says whether the caller should read the listings again, because the listing may have
// changed or gone on the other side.
const LISTING_ERRORS = {
  DISTRIBUTION_LISTING_NOT_FOUND: { reread: true, message: "We couldn't find this listing." },
  DISTRIBUTION_LISTING_NOT_OWNED: { reread: false, message: "You don't have access to this listing." },
};

export const errorCodeOf = (error) => error?.responseBody?.errorCode;

export const classifyListingError = (error) => LISTING_ERRORS[errorCodeOf(error)] ?? null;
