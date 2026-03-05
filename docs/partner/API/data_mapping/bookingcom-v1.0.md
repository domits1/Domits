## Booking.com → Domits v1.0

- **Version**: `v1.0`
- **Channel**: `BOOKING_COM`
- **Scope**: Reservation, guest, financial transaction, cancellation, units, rate plans, and minimal availability.
- **Canonical model source**: `backend/functions/General-Bookings-CRUD-Bookings-develop/business/bookingComCanonicalModel.js`

### Reservation mappings

- **Identifiers**
  - **Booking.com**: `reservation_id` (or `id`)
  - **Canonical**: `CanonicalReservation.externalId`
  - **DB**: `channel_reservation.externalid`

- **Channel**
  - **Canonical**: `CanonicalReservation.channel = 'BOOKING_COM'`
  - **DB**: `channel_reservation.channel`

- **Version**
  - **Canonical**: `CanonicalReservation.version = BOOKING_COM_MAPPING_VERSION ('1.0')`
  - **DB**: `channel_reservation.version`

- **Property linkage**
  - **Canonical**: `CanonicalReservation.propertyId` (nullable, not resolved in v1.0)
  - **DB**: `channel_reservation.property_id` (nullable)

- **Booking linkage**
  - **Canonical**: `CanonicalReservation.bookingId` (nullable, reserved for future bridging)
  - **DB**: `channel_reservation.booking_id` (nullable)

- **Dates**
  - **Booking.com**:
    - `arrival_date` – usually `YYYY-MM-DD`
    - `departure_date` – usually `YYYY-MM-DD`
  - **Canonical**:
    - `CanonicalReservation.checkInDate` – ISO 8601 via `new Date(arrival_date).toISOString()`
    - `CanonicalReservation.checkOutDate` – ISO 8601 via `new Date(departure_date).toISOString()`
  - **DB**:
    - `channel_reservation.checkindate` – epoch ms `BIGINT`
    - `channel_reservation.checkoutdate` – epoch ms `BIGINT`

- **Timestamps**
  - **Booking.com**:
    - `created_at` / `creation_date` (optional)
    - `updated_at` / `modification_date` (optional)
  - **Canonical**:
    - `CanonicalReservation.createdAt` – ISO, falls back to `arrival_date` or current time
    - `CanonicalReservation.updatedAt` – ISO, falls back to `createdAt`
  - **DB**:
    - `channel_reservation.createdat` – epoch ms
    - `channel_reservation.updatedat` – epoch ms

- **Status (normalized)**
  - **Booking.com**: `status` (string)
  - **Canonical**: `CanonicalReservation.status` using `ReservationStatus` enum:
    - `BOOKED`, `CONFIRMED` → `ReservationStatus.CONFIRMED ('confirmed')`
    - `CANCELLED`, `CANCELLED_BY_GUEST`, `CANCELLED_BY_PARTNER` → `ReservationStatus.CANCELLED ('cancelled')`
    - `NO_SHOW` → `ReservationStatus.NO_SHOW ('no_show')`
    - `PENDING`, `ON_REQUEST` → `ReservationStatus.PENDING ('pending')`
    - Any other value or missing → `ReservationStatus.UNKNOWN ('unknown')`
  - **DB**: `channel_reservation.status` stores the canonical value.

- **Meta**
  - **Canonical**:
    - `CanonicalReservation.meta.warnings` – array of human-readable mapping warnings.
  - **DB**:
    - `channel_reservation.meta` – JSONB storing meta, including warnings.

### Guest mappings

- **Name**
  - **Booking.com**:
    - `guest_name`
    - or from `guest` / `primary_guest`: `name`, `full_name`
  - **Canonical**:
    - `CanonicalGuest.fullName`
    - If missing, defaults to `'Unknown Guest'` and records a warning in `meta.warnings`.
  - **DB**: `channel_guest.fullname`

- **Email**
  - **Booking.com**: `guest_email` or `guest.email`
  - **Canonical**: `CanonicalGuest.email` (nullable)
  - **DB**: `channel_guest.email`

- **Phone**
  - **Booking.com**: `guest_phone` or `guest.phone` / `guest.telephone`
  - **Canonical**: `CanonicalGuest.phone` (nullable)
  - **DB**: `channel_guest.phone`

- **Country**
  - **Booking.com**: `guest_country` or `guest.country` / `guest.country_code`
  - **Canonical**: `CanonicalGuest.country` (nullable)
  - **DB**: `channel_guest.country`

- **Raw guest data**
  - **Canonical**: `CanonicalGuest.raw` – raw guest object when present.
  - **DB**: `channel_guest.raw_guest` – JSONB copy of raw guest structure.

### Financial transaction mappings

- **Total amount**
  - **Booking.com**:
    - `total_price`
    - or `total_price_including_tax`
    - or `total`
    - or `price`
  - **Canonical**:
    - `CanonicalFinancialTransaction.totalAmount` – `Number(...)` or `null` when not numeric.
  - **DB**: `channel_financial_transaction.totalamount` (NUMERIC, nullable)

- **Currency**
  - **Booking.com**:
    - `currency_code`
    - or `charged_currency`
    - or `currency`
  - **Canonical**:
    - `CanonicalFinancialTransaction.currency` – ISO 4217 (3-letter uppercase), validated.
  - **DB**: `channel_financial_transaction.currency`

- **Tax amount**
  - **Booking.com**:
    - `tax_amount`
    - or `taxes_total`
    - or `total_tax_amount`
  - **Canonical**: `CanonicalFinancialTransaction.taxAmount` – numeric or `null`
  - **DB**: `channel_financial_transaction.taxamount`

- **Fees amount**
  - **Booking.com**:
    - `fees_amount`
    - or `fee_total`
    - or `extra_fees`
  - **Canonical**: `CanonicalFinancialTransaction.feesAmount` – numeric or `null`
  - **DB**: `channel_financial_transaction.feesamount`

- **Multi-currency handling**
  - **Booking.com**:
    - `original_currency` / `base_currency`
    - `original_amount` / `base_price`
  - **Canonical**:
    - `CanonicalFinancialTransaction.multiCurrency` – `true` if original and charged currencies differ.
    - `CanonicalFinancialTransaction.originalCurrency`
    - `CanonicalFinancialTransaction.originalAmount`
  - **DB**:
    - `channel_financial_transaction.multicurrency`
    - `channel_financial_transaction.originalcurrency`
    - `channel_financial_transaction.originalamount`
  - **Behavior**:
    - When `multiCurrency === true`, a warning is added to `meta.warnings`.
    - Charged currency is always used as the main `currency`.

- **Raw financial data**
  - **Canonical**: `CanonicalFinancialTransaction.raw` (e.g. `payload.pricing`)
  - **DB**: `channel_financial_transaction.raw_financial`

### Cancellation mappings

- **Cancellation presence**
  - **Booking.com**:
    - `cancellation`
    - or `cancellation_details`
    - or flags: `cancellation_type`, `cancelled`, partial line-items.
  - **Canonical**:
    - `CanonicalCancellation` constructed when any reasonable cancellation info is present.
    - Otherwise, `cancellation` is `null`.

- **Cancellation type**
  - **Booking.com** (examples):
    - `cancellation.partial === true`
    - `cancellation.type === 'PARTIAL'`
    - `cancellation_type === 'PARTIAL'`
    - room/line-item level cancellations (e.g. `cancellation.line_items`).
  - **Canonical**:
    - `CanonicalCancellation.type = 'PARTIAL'` (via `CancellationType.PARTIAL`) when a partial cancellation is detected.
    - Otherwise `CanonicalCancellation.type = 'FULL'` (via `CancellationType.FULL`).
  - **DB**: `channel_cancellation.type`

- **Effective date**
  - **Booking.com**:
    - `cancellation.effective_date`
    - or `cancellation.cancelled_at`
    - or `cancellation_effective_date`
    - or `updated_at`
    - or `arrival_date` (fallback)
  - **Canonical**: `CanonicalCancellation.effectiveDate` – ISO 8601.
  - **DB**: `channel_cancellation.effectivedate` – epoch ms.

- **Reason**
  - **Booking.com**:
    - `cancellation.reason`
    - or `cancellation.reason_code`
    - or `cancellation_reason`
  - **Canonical**: `CanonicalCancellation.reason` (nullable)
  - **DB**: `channel_cancellation.reason`

- **Raw cancellation payload**
  - **Canonical**: `CanonicalCancellation.raw` – raw Booking.com cancellation object.
  - **DB**: `channel_cancellation.raw_cancellation`

- **Status interaction**
  - **Full cancellations**:
    - Canonical status typically set to `ReservationStatus.CANCELLED` based on `status` field, not the presence of a cancellation record alone.
  - **Partial cancellations**:
    - `CanonicalCancellation.type = 'PARTIAL'`.
    - `CanonicalReservation.status` remains as mapped from `status` (often `confirmed`), i.e. **partial cancellation does not automatically set the reservation to `cancelled`**.

### Units and rate plans

- **Units / rooms**
  - **Booking.com**:
    - `rooms[]`
    - or `units[]`
    - typical fields: `id`, `room_id`, `name`, `room_name`, `occupancy`
  - **Canonical**:
    - `CanonicalReservation.units` – array of `CanonicalUnit`:
      - `externalId` ← `room.id` / `room.room_id`
      - `name` ← `room.name` / `room.room_name`
      - `occupancy` ← numeric occupancy when available
      - `raw` ← full room object
  - **Behavior**:
    - If no units are provided, `units` is an empty array and a warning is added.

- **Rate plans**
  - **Booking.com**:
    - `rate_plans[]` or `ratePlans[]` with `id`, `rate_plan_id`, `name`, `type`
    - or top-level `rate_plan_id` / `rate_plan_name`
  - **Canonical**:
    - `ratePlans` – array of `CanonicalRatePlan`:
      - `externalId` ← `id` / `rate_plan_id`
      - `name` ← `name` / `rate_plan_name`
      - `type` ← `type.toUpperCase()` or `'UNKNOWN'`
      - `raw` ← raw rate plan object
    - `reservation.ratePlan` – the first element from `ratePlans` or `null`.
    - When only top-level `rate_plan_id` is present, a minimal `UNKNOWN` rate plan is synthesized and a warning is added.

### Availability windows

- **Derivation**
  - **Input**:
    - `arrival_date` / `departure_date`
    - Canonical `units`
  - **Canonical**:
    - `availabilityWindows` – array of `CanonicalAvailabilityWindow`:
      - `startDate` ← `CanonicalReservation.checkInDate`
      - `endDate` ← `CanonicalReservation.checkOutDate`
      - `unitExternalId` ← each unit’s `externalId`, or `null` when no units.
      - `raw` ← undefined (v1.0 does not preserve extra availability payloads).
  - **Behavior**:
    - If there are no units, a single availability window is created with `unitExternalId = null`.
    - If dates are missing or invalid, `availabilityWindows` may be an empty array.

### Validation rules

- **Structural**
  - Payload must be a non-null object.
  - Required fields:
    - `reservation_id` (or `id`)
    - `arrival_date`
    - `departure_date`
    - `status`
    - at least one price field (`total_price` / `total_price_including_tax` / `total` / `price`)
    - a valid currency field (`currency_code` / `charged_currency` / `currency`)

- **Date validation**
  - `arrival_date` and `departure_date` must parse to valid dates.
  - `arrival_date` must be **strictly before** `departure_date`.
  - Violations cause a `TypeException` with details in `error.details.errors`.

- **Currency validation**
  - Currency must match the regex `^[A-Z]{3}$` (ISO 4217 style).
  - Invalid currency causes a `TypeException`.

- **Status validation**
  - Input `status` is required but not restricted to a set at validation time.
  - During mapping, unknown statuses are coerced to `ReservationStatus.UNKNOWN` and may trigger a warning.

### Edge cases and behavior summary

- **Partial cancellations**
  - Recognized via flags (`partial`, `type: 'PARTIAL'`, line-item arrays, or top-level `cancellation_type`).
  - Mapped to `CancellationType.PARTIAL`.
  - Reservation status is **not** automatically switched to `cancelled` unless Booking.com’s `status` explicitly indicates it.

- **Multi-unit bookings**
  - All rooms/units in Booking.com payload become entries in `units`.
  - `availabilityWindows` are created per-unit for the global check-in/check-out period.

- **Missing guest information**
  - When guest name cannot be derived, `CanonicalGuest.fullName = 'Unknown Guest'`.
  - This condition is recorded in `meta.warnings`.

- **Multi-currency reservations**
  - Charged currency derived from `currency_code` / `charged_currency` / `currency`.
  - Original currency and amount captured from `original_currency` / `base_currency` and `original_amount` / `base_price`.
  - When original and charged currencies differ:
    - `multiCurrency = true`
    - A warning is recorded in `meta.warnings`.

- **Unknown rate plans**
  - When rate plan type is missing or unknown:
    - `CanonicalRatePlan.type = 'UNKNOWN'`
    - Raw rate plan data is preserved in `CanonicalRatePlan.raw`.
    - Mapping does **not** throw; a warning may be logged.

### Error handling & logging

- **Validation failures**
  - `validateBookingComPayload` throws `TypeException` with:
    - `message = "Invalid Booking.com payload."`
    - `details.errors` – array of human-readable messages.

- **Mapping warnings**
  - Non-fatal anomalies (missing optional fields, synthesized defaults, multi-currency) are collected into `meta.warnings`.
  - Callers can log them via `bookingComLogger.logBookingComMappingWarning`.

- **Persistence failures**
  - `persistBookingComCanonicalReservation` logs structured details using `logBookingComMappingError` and then rethrows the underlying error.
  - Logging includes:
    - `externalId`
    - `channel: 'BOOKING_COM'`
    - `version`
    - error name, message, and stack.

