// Canonical Booking.com v1.0 domain model for channel reservations
// This module is intentionally pure (no IO / DB access) so it can be reused by
// mapping, validation, and persistence layers.

// Reservation status enum (normalized / canonical)
export const ReservationStatus = {
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
  NO_SHOW: "no_show",
  PENDING: "pending",
  UNKNOWN: "unknown",
};

// Cancellation type enum
export const CancellationType = {
  FULL: "FULL",
  PARTIAL: "PARTIAL",
};

// Supported channels for this canonical layer
export const Channel = {
  BOOKING_COM: "BOOKING_COM",
};

// Current mapping version
export const BOOKING_COM_MAPPING_VERSION = "1.0";

/**
 * @typedef {Object} CanonicalUnit
 * @property {string|null} externalId - External unit/room identifier from Booking.com
 * @property {string|null} name - Human-readable unit or room name
 * @property {number|null} occupancy - Maximum occupancy for this unit
 * @property {Object|undefined} raw - Raw Booking.com unit payload (for future use)
 */

/**
 * @typedef {Object} CanonicalRatePlan
 * @property {string|null} externalId - External rate plan identifier from Booking.com
 * @property {string|null} name - Human-readable rate plan name
 * @property {string} type - Normalized type (e.g. 'STANDARD', 'NON_REFUNDABLE', 'UNKNOWN')
 * @property {Object|undefined} raw - Raw Booking.com rate plan payload
 */

/**
 * @typedef {Object} CanonicalAvailabilityWindow
 * @property {string} startDate - ISO 8601 start date (inclusive) of availability
 * @property {string} endDate - ISO 8601 end date (exclusive) of availability
 * @property {string|null} unitExternalId - External unit identifier this window applies to
 * @property {Object|undefined} raw - Raw Booking.com availability payload
 */

/**
 * @typedef {Object} CanonicalReservation
 * @property {string} externalId - Booking.com reservation identifier
 * @property {string} channel - Channel identifier, e.g. 'BOOKING_COM'
 * @property {string} version - Mapping version, e.g. '1.0'
 * @property {string|null} propertyId - Internal Domits property ID (if resolved)
 * @property {string|null} bookingId - Internal Domits booking ID (if linked)
 * @property {string} checkInDate - ISO 8601 check-in date/time
 * @property {string} checkOutDate - ISO 8601 check-out date/time
 * @property {string} status - Normalized reservation status (see ReservationStatus)
 * @property {Array<CanonicalUnit>} units - Units/rooms for this reservation
 * @property {CanonicalRatePlan|null} ratePlan - Primary rate plan for this reservation
 * @property {Array<CanonicalAvailabilityWindow>} availabilityWindows - Derived availability blocks
 * @property {string} createdAt - ISO 8601 creation timestamp (from Booking.com or ingestion time)
 * @property {string} updatedAt - ISO 8601 last-updated timestamp
 * @property {{ warnings: string[] }} meta - Metadata such as mapping warnings
 */

/**
 * @typedef {Object} CanonicalGuest
 * @property {string} fullName - Guest full name (or 'Unknown Guest' fallback)
 * @property {string|null} email - Guest email, if provided
 * @property {string|null} phone - Guest phone number, if provided
 * @property {string|null} country - Guest country code, if provided
 * @property {Object|undefined} raw - Raw Booking.com guest payload
 */

/**
 * @typedef {Object} CanonicalFinancialTransaction
 * @property {number|null} totalAmount - Total amount charged, inclusive of taxes
 * @property {string|null} currency - ISO 4217 currency code
 * @property {number|null} taxAmount - Tax amount, if provided separately
 * @property {number|null} feesAmount - Additional fees (e.g. cleaning), if provided
 * @property {boolean} multiCurrency - True when original and charged currencies differ
 * @property {string|null} originalCurrency - Original currency, if different
 * @property {number|null} originalAmount - Original amount, if different
 * @property {Object|undefined} raw - Raw Booking.com financial payload
 */

/**
 * @typedef {Object} CanonicalCancellation
 * @property {string} type - Cancellation type (FULL or PARTIAL, see CancellationType)
 * @property {string} effectiveDate - ISO 8601 date/time when cancellation became effective
 * @property {string|null} reason - Human-readable or code-based reason, if provided
 * @property {Object|undefined} raw - Raw Booking.com cancellation payload
 */

/**
 * @typedef {Object} CanonicalBookingComMapping
 * @property {CanonicalReservation} reservation
 * @property {CanonicalGuest} guest
 * @property {CanonicalFinancialTransaction} financialTransaction
 * @property {CanonicalCancellation|null} cancellation
 * @property {Object|undefined} property - Optional property-related canonical data / identifiers
 * @property {Array<CanonicalUnit>} units
 * @property {Array<CanonicalRatePlan>} ratePlans
 * @property {Array<CanonicalAvailabilityWindow>} availabilityWindows
 * @property {{ warnings: string[] }} meta
 */

// This module intentionally exports only constants; the typedefs are provided for
// editor tooling and documentation. Runtime code should construct plain objects
// that conform to these shapes.

