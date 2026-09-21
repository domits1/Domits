export const BOOKING_REQUEST_ERROR_SCOPES = Object.freeze({
  CONTACT: "contact",
  DATES: "dates",
  QUOTE: "quote",
  PANEL: "panel",
});

export const BOOKING_REQUEST_RECOVERY = Object.freeze({
  NONE: "none",
  RETRY: "retry",
  REQUOTE: "requote",
  RECHECK: "recheck",
});

const SITE_LIFECYCLE_CODES = new Set(["site_not_found", "site_not_published", "site_suspended"]);
const RECHECK_CODES = new Set(["invalid_date_range", "invalid_guest_count", "quote_token_invalid"]);
const TRANSIENT_CODES = new Set(["booking_service_unavailable", "pricing_service_unavailable", "network_error"]);

const presentation = ({
  scope,
  message,
  recovery = BOOKING_REQUEST_RECOVERY.NONE,
  clearSelection = false,
  blockDates = false,
  hideAction = false,
  showContact = false,
  showReference = false,
}) => ({ scope, message, recovery, clearSelection, blockDates, hideAction, showContact, showReference });

export const resolveBookingRequestErrorPresentation = (error) => {
  const code = String(error?.code || "");
  const serverMessage = String(error?.message || "").trim();
  const hasReference = Boolean(String(error?.requestId || "").trim());

  if (code === "invalid_guest_contact") {
    return presentation({
      scope: BOOKING_REQUEST_ERROR_SCOPES.CONTACT,
      message: serverMessage || "Please enter your name and a valid email address.",
    });
  }

  if (code === "quote_expired") {
    return presentation({
      scope: BOOKING_REQUEST_ERROR_SCOPES.QUOTE,
      message: "The price changed — we've refreshed it. Please review and request again.",
      recovery: BOOKING_REQUEST_RECOVERY.REQUOTE,
    });
  }

  if (code === "unavailable_dates") {
    return presentation({
      scope: BOOKING_REQUEST_ERROR_SCOPES.DATES,
      message: "Those dates are no longer available — please choose different dates.",
      clearSelection: true,
      blockDates: true,
    });
  }

  if (code === "stay_restriction_violation") {
    return presentation({
      scope: BOOKING_REQUEST_ERROR_SCOPES.DATES,
      message: serverMessage || "These dates don't meet this property's stay rules.",
      clearSelection: true,
    });
  }

  if (RECHECK_CODES.has(code)) {
    return presentation({
      scope: BOOKING_REQUEST_ERROR_SCOPES.QUOTE,
      message: "Please check availability again.",
      recovery: BOOKING_REQUEST_RECOVERY.RECHECK,
      showReference: code === "quote_token_invalid" && hasReference,
    });
  }

  if (SITE_LIFECYCLE_CODES.has(code)) {
    return presentation({
      scope: BOOKING_REQUEST_ERROR_SCOPES.PANEL,
      message: "Online booking isn't available for this site right now.",
      hideAction: true,
    });
  }

  if (code === "quote_unavailable") {
    return presentation({
      scope: BOOKING_REQUEST_ERROR_SCOPES.PANEL,
      message: "This property can't be booked online right now.",
      showContact: true,
    });
  }

  if (code === "rate_limited") {
    return presentation({
      scope: BOOKING_REQUEST_ERROR_SCOPES.PANEL,
      message: "Too many requests — please try again in a moment.",
      recovery: BOOKING_REQUEST_RECOVERY.RETRY,
    });
  }

  if (TRANSIENT_CODES.has(code)) {
    return presentation({
      scope: BOOKING_REQUEST_ERROR_SCOPES.PANEL,
      message: "We couldn't send your request. Please try again.",
      recovery: BOOKING_REQUEST_RECOVERY.RETRY,
    });
  }

  return presentation({
    scope: BOOKING_REQUEST_ERROR_SCOPES.PANEL,
    message: "Something went wrong while sending your request. Please try again.",
    recovery: BOOKING_REQUEST_RECOVERY.RETRY,
    showReference: hasReference,
  });
};
