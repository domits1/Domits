import {
  Channel,
  ReservationStatus,
} from "../../functions/General-Bookings-CRUD-Bookings-develop/business/bookingComCanonicalModel.js";

/**
 * Creates a mock manager for testing persistence functions.
 * Captures all insert operations in the `inserts` array.
 * @param {Array} inserts - Array to capture insert operations
 * @returns {Object} Mock manager object
 */
export function createMockManager(inserts = []) {
  return {
    createQueryBuilder: () => ({
      insert: () => ({
        into: (table) => ({
          values: (value) => ({
            execute: async () => {
              inserts.push({
                table,
                value,
              });
            },
          }),
        }),
      }),
    }),
  };
}

/**
 * Creates a base canonical reservation object.
 * @param {Object} overrides - Properties to override
 * @returns {Object} Canonical reservation object
 */
export function createCanonicalReservation(overrides = {}) {
  const base = {
    reservation: {
      externalId: "R123",
      channel: Channel.BOOKING_COM,
      version: "1.0",
      propertyId: "prop-1",
      bookingId: null,
      checkInDate: "2025-01-01T00:00:00.000Z",
      checkOutDate: "2025-01-05T00:00:00.000Z",
      status: ReservationStatus.CONFIRMED,
      units: [],
      ratePlan: null,
      availabilityWindows: [],
      createdAt: "2024-12-01T00:00:00.000Z",
      updatedAt: "2024-12-02T00:00:00.000Z",
      meta: { warnings: [] },
    },
    guest: {
      fullName: "John Doe",
      email: "john@example.com",
      phone: "+49123",
      country: "DE",
      raw: { some: "guest" },
    },
    financialTransaction: {
      totalAmount: 100,
      currency: "EUR",
      taxAmount: 10,
      feesAmount: 5,
      multiCurrency: false,
      originalCurrency: null,
      originalAmount: null,
      raw: { some: "financial" },
    },
    cancellation: {
      type: "FULL",
      effectiveDate: "2024-12-31T00:00:00.000Z",
      reason: "Guest cancelled",
      raw: { some: "cancellation" },
    },
    units: [],
    ratePlans: [],
    availabilityWindows: [],
    meta: { warnings: [] },
  };

  return {
    ...base,
    ...overrides,
    reservation: { ...base.reservation, ...(overrides.reservation || {}) },
    guest: { ...base.guest, ...(overrides.guest || {}) },
    financialTransaction: {
      ...base.financialTransaction,
      ...(overrides.financialTransaction || {}),
    },
    cancellation: overrides.cancellation !== undefined ? overrides.cancellation : base.cancellation,
    meta: { ...base.meta, ...(overrides.meta || {}) },
  };
}

/**
 * Creates a base Booking.com payload for mapper tests.
 * @param {Object} overrides - Properties to override
 * @returns {Object} Base payload object
 */
export function createBasePayload(overrides = {}) {
  const base = {
    reservation_id: "R123",
    arrival_date: "2025-01-01",
    departure_date: "2025-01-05",
    status: "BOOKED",
    total_price: "150.00",
    currency_code: "EUR",
    guest_name: "John Doe",
    guest_email: "john@example.com",
    guest_phone: "+4912345",
    guest_country: "DE",
    rooms: [
      {
        id: "ROOM1",
        name: "Standard Room",
        occupancy: 2,
      },
    ],
    rate_plans: [
      {
        id: "RP1",
        name: "Standard Rate",
        type: "STANDARD",
      },
    ],
  };

  return { ...base, ...overrides };
}

/**
 * Helper function to setup test environment for service tests.
 * Returns common test objects to reduce duplication.
 * @param {Object} canonicalOverrides - Overrides for canonical reservation
 * @returns {Object} Test setup objects { inserts, mockManager, canonical }
 */
export function setupServiceTest(canonicalOverrides = {}) {
  const inserts = [];
  const mockManager = createMockManager(inserts);
  const canonical = createCanonicalReservation(canonicalOverrides);
  return { inserts, mockManager, canonical };
}

/**
 * Helper function to find an insert by field value.
 * Searches across all tables in the inserts array.
 * @param {Array} inserts - Array of insert operations
 * @param {string} field - Field name to match
 * @param {*} value - Value to match
 * @returns {Object|undefined} Found insert or undefined
 */
export function findInsertByField(inserts, field, value) {
  return inserts.find(
    (i) => i.value && i.value[field] === value
  );
}


/**
 * Helper function to setup mapper test with validated payload.
 * Reduces duplication in mapper tests.
 * @param {Object} payloadOverrides - Overrides for base payload
 * @param {Function} validateFn - Validation function to use
 * @returns {Object} Validated payload
 */
export function createValidatedPayload(payloadOverrides = {}, validateFn) {
  const payload = createBasePayload(payloadOverrides);
  return validateFn(payload);
}
