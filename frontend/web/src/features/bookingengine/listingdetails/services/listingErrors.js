export const LISTING_NOT_FOUND = "LISTING_NOT_FOUND";
export const LISTING_REQUEST_FAILED = "LISTING_REQUEST_FAILED";

export const createListingError = (code, message) => {
  const error = new Error(message);
  error.code = code;
  return error;
};

export const isListingNotFoundError = (error) => error?.code === LISTING_NOT_FOUND;
