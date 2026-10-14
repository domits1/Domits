export const QUOTE_ERROR_SCOPES = Object.freeze({
  DATES: "dates",
  GUESTS: "guests",
  PANEL: "panel",
});

const SITE_LIFECYCLE_CODES = new Set(["site_not_found", "site_not_published", "site_suspended"]);
const TRANSIENT_CODES = new Set(["pricing_service_unavailable", "network_error", "rate_limited"]);
const SERVER_MESSAGE_CODES = Object.freeze({
  invalid_date_range: QUOTE_ERROR_SCOPES.DATES,
  stay_restriction_violation: QUOTE_ERROR_SCOPES.DATES,
  invalid_guest_count: QUOTE_ERROR_SCOPES.GUESTS,
});

const FALLBACK_MESSAGES = Object.freeze({
  invalid_date_range: "Please choose a valid check-in and check-out date.",
  stay_restriction_violation: "These dates don't meet this property's stay rules.",
  invalid_guest_count: "Please choose a valid number of guests.",
});

const presentation = ({
  scope,
  message,
  canRetry = false,
  showContact = false,
  showReference = false,
  hideAction = false,
  clearSelection = false,
}) => ({ scope, message, canRetry, showContact, showReference, hideAction, clearSelection });

export const resolveQuoteErrorPresentation = (error) => {
  const code = String(error?.code || "");
  const serverMessage = String(error?.message || "").trim();

  if (SERVER_MESSAGE_CODES[code]) {
    return presentation({
      scope: SERVER_MESSAGE_CODES[code],
      message: serverMessage || FALLBACK_MESSAGES[code],
    });
  }

  if (code === "unavailable_dates") {
    return presentation({
      scope: QUOTE_ERROR_SCOPES.DATES,
      message: "Those dates are no longer available — please choose different dates.",
      clearSelection: true,
    });
  }

  if (SITE_LIFECYCLE_CODES.has(code)) {
    return presentation({
      scope: QUOTE_ERROR_SCOPES.PANEL,
      message: "Online booking isn't available for this site right now.",
      hideAction: true,
    });
  }

  if (code === "quote_unavailable") {
    return presentation({
      scope: QUOTE_ERROR_SCOPES.PANEL,
      message: "This property can't be booked online right now.",
      showContact: true,
    });
  }

  if (code === "rate_limited") {
    return presentation({
      scope: QUOTE_ERROR_SCOPES.PANEL,
      message: "Too many requests — please try again in a moment.",
      canRetry: true,
    });
  }

  if (TRANSIENT_CODES.has(code)) {
    return presentation({
      scope: QUOTE_ERROR_SCOPES.PANEL,
      message: "We couldn't check live pricing. Please try again.",
      canRetry: true,
    });
  }

  return presentation({
    scope: QUOTE_ERROR_SCOPES.PANEL,
    message: "Something went wrong while checking this price. Please try again.",
    canRetry: true,
    showReference: Boolean(String(error?.requestId || "").trim()),
  });
};
