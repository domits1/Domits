/**
 * Minimal logging helpers for Booking.com integration.
 * These currently log to console but keep a structured shape so they can be
 * wired to a centralized logger later without changing call sites.
 */

export function logBookingComMappingError(context, error) {
  console.error(
    JSON.stringify(
      {
        level: "error",
        source: "bookingcom",
        channel: "BOOKING_COM",
        message: "Booking.com mapping/persistence error",
        context,
        error: {
          name: error?.name,
          message: error?.message,
          stack: error?.stack,
        },
      },
      null,
      2
    )
  );
}

export function logBookingComMappingWarning(context, warning) {
  console.warn(
    JSON.stringify(
      {
        level: "warn",
        source: "bookingcom",
        channel: "BOOKING_COM",
        message: "Booking.com mapping warning",
        context,
        warning,
      },
      null,
      2
    )
  );
}

