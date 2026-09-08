export const BOOKING_REQUEST_ERROR_SCOPES = Object.freeze({
  CONTACT: "contact",
  PANEL: "panel",
});

export const BOOKING_REQUEST_RECOVERY = Object.freeze({
  NONE: "none",
  RETRY: "retry",
});

const SITE_LIFECYCLE_CODES = new Set(["site_not_found", "site_not_published", "site_suspended"]);

const presentation = ({
  scope,
  message,
  recovery = BOOKING_REQUEST_RECOVERY.NONE,
  hideAction = false,
  showReference = false,
}) => ({ scope, message, recovery, hideAction, showReference });

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

  if (SITE_LIFECYCLE_CODES.has(code)) {
    return presentation({
      scope: BOOKING_REQUEST_ERROR_SCOPES.PANEL,
      message: "Online booking isn't available for this site right now.",
      hideAction: true,
    });
  }

  return presentation({
    scope: BOOKING_REQUEST_ERROR_SCOPES.PANEL,
    message: "We couldn't send your request. Please try again.",
    recovery: BOOKING_REQUEST_RECOVERY.RETRY,
    showReference: hasReference,
  });
};
