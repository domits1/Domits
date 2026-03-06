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

// Property category enum (Booking.com property types)
export const PropertyCategory = {
  HOTEL: "hotel",
  APARTMENT: "apartment",
  GUEST_HOUSE: "guest_house",
  HOSTEL: "hostel",
  BED_AND_BREAKFAST: "bed_and_breakfast",
  VACATION_HOME: "vacation_home",
  RESORT: "resort",
  UNKNOWN: "unknown",
};

// Property status enum
export const PropertyStatus = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  PENDING: "pending",
  SUSPENDED: "suspended",
};

// Rate plan type enum
export const RatePlanType = {
  STANDARD: "STANDARD",
  DERIVED: "DERIVED",
  OBP: "OBP", // Occupancy-Based Pricing
  LOS: "LOS", // Length of Stay
  UNKNOWN: "UNKNOWN",
};

// Pricing strategy enum
export const PricingStrategy = {
  STANDARD: "STANDARD",
  OCCUPANCY_BASED: "OCCUPANCY_BASED",
  LENGTH_OF_STAY: "LENGTH_OF_STAY",
  UNKNOWN: "UNKNOWN",
};

// Restriction type enum
export const RestrictionType = {
  MIN_LOS: "MIN_LOS", // Minimum Length of Stay
  MAX_LOS: "MAX_LOS", // Maximum Length of Stay
  CLOSED: "CLOSED", // Fully closed
  CTA: "CTA", // Closed to Arrival
  CTD: "CTD", // Closed to Departure
  MIN_ADV: "MIN_ADV", // Minimum Advance Booking
  MAX_ADV: "MAX_ADV", // Maximum Advance Booking
  EXACT_STAY: "EXACT_STAY", // Exact number of nights required
  UNKNOWN: "UNKNOWN",
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
 * @typedef {Object} CanonicalPropertyAddress
 * @property {string|null} street - Street address
 * @property {string|null} city - City name
 * @property {string|null} state - State/Province
 * @property {string|null} postalCode - Postal/ZIP code
 * @property {string|null} country - ISO 3166-1 alpha-2 country code
 * @property {number|null} latitude - Latitude coordinate
 * @property {number|null} longitude - Longitude coordinate
 */

/**
 * @typedef {Object} CanonicalPropertyContact
 * @property {string|null} phone - Primary phone number
 * @property {string|null} email - Contact email
 * @property {string|null} website - Website URL
 */

/**
 * @typedef {Object} CanonicalPropertyPolicy
 * @property {string|null} checkInTime - Check-in time (HH:MM format)
 * @property {string|null} checkOutTime - Check-out time (HH:MM format)
 * @property {string|null} cancellationPolicy - Cancellation policy description
 * @property {string|null} petPolicy - Pet policy description
 * @property {string|null} smokingPolicy - Smoking policy description
 */

/**
 * @typedef {Object} CanonicalProperty
 * @property {string} externalId - External property identifier from Booking.com
 * @property {string|null} internalId - Internal Domits property ID (if linked)
 * @property {string} name - Property name
 * @property {string} category - Property category (see PropertyCategory)
 * @property {string} status - Property status (see PropertyStatus)
 * @property {CanonicalPropertyAddress} address - Property address and location
 * @property {CanonicalPropertyContact} contact - Contact information
 * @property {CanonicalPropertyPolicy} policy - Property policies
 * @property {string|null} description - Property description
 * @property {number|null} starRating - Star rating (1-5)
 * @property {number|null} numberOfRooms - Total number of rooms/units
 * @property {string} createdAt - ISO 8601 creation timestamp
 * @property {string} updatedAt - ISO 8601 last-updated timestamp
 * @property {Object|undefined} raw - Raw Booking.com property payload
 */

/**
 * @typedef {Object} CanonicalRate
 * @property {string} date - ISO 8601 date for this rate
 * @property {number} amount - Price amount
 * @property {string} currency - ISO 4217 currency code
 * @property {number|null} singleUseAmount - Price for single occupancy (if different)
 * @property {number|null} extraPersonAmount - Price per extra person
 * @property {Object|undefined} raw - Raw rate data
 */

/**
 * @typedef {Object} CanonicalRatePlanDetail
 * @property {string} externalId - Rate plan identifier
 * @property {string} name - Rate plan name
 * @property {string} type - Rate plan type (see RatePlanType)
 * @property {string} strategy - Pricing strategy (see PricingStrategy)
 * @property {string|null} propertyExternalId - Linked property ID
 * @property {Array<CanonicalRate>} rates - Array of rates
 * @property {Object|undefined} derivedFrom - For DERIVED type: base rate plan and adjustment
 * @property {Object|undefined} occupancyTiers - For OBP type: pricing per occupancy level
 * @property {Object|undefined} losTiers - For LOS type: pricing per length of stay
 * @property {string} createdAt - ISO 8601 creation timestamp
 * @property {string} updatedAt - ISO 8601 last-updated timestamp
 * @property {{ warnings: string[] }} meta - Metadata
 */

/**
 * @typedef {Object} CanonicalAvailability
 * @property {string} externalId - Availability window identifier
 * @property {string|null} propertyExternalId - Linked property ID
 * @property {string|null} unitExternalId - Linked unit/room ID
 * @property {string} startDate - ISO 8601 start date
 * @property {string} endDate - ISO 8601 end date
 * @property {number} availableCount - Number of available units
 * @property {boolean} isAvailable - Whether this period is bookable
 * @property {string} createdAt - ISO 8601 creation timestamp
 * @property {string} updatedAt - ISO 8601 last-updated timestamp
 * @property {{ warnings: string[] }} meta - Metadata
 */

/**
 * @typedef {Object} CanonicalRestriction
 * @property {string} externalId - Restriction identifier
 * @property {string} type - Restriction type (see RestrictionType)
 * @property {string|null} propertyExternalId - Linked property ID
 * @property {string|null} unitExternalId - Linked unit/room ID
 * @property {string|null} ratePlanExternalId - Linked rate plan ID
 * @property {string} startDate - ISO 8601 start date
 * @property {string} endDate - ISO 8601 end date
 * @property {number|null} minLOS - Minimum length of stay (nights)
 * @property {number|null} maxLOS - Maximum length of stay (nights)
 * @property {number|null} minAdvanceDays - Minimum days in advance to book
 * @property {number|null} maxAdvanceDays - Maximum days in advance to book
 * @property {number|null} exactStayNights - Exact number of nights required
 * @property {boolean} closedToArrival - No arrivals allowed
 * @property {boolean} closedToDeparture - No departures allowed
 * @property {boolean} fullyClosed - Period is fully closed
 * @property {string} createdAt - ISO 8601 creation timestamp
 * @property {string} updatedAt - ISO 8601 last-updated timestamp
 * @property {{ warnings: string[] }} meta - Metadata
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
