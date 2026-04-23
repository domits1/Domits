CREATE TABLE IF NOT EXISTS main.channex_booking_revision (
  "id" VARCHAR(255) NOT NULL,
  "integrationAccountId" VARCHAR(255) NOT NULL,
  "domitsPropertyId" VARCHAR(255) NOT NULL,
  "externalPropertyId" VARCHAR(255) NOT NULL,
  "externalReservationId" VARCHAR(255) NOT NULL,
  "revisionId" VARCHAR(255) NOT NULL,
  "bookingStatus" VARCHAR(255),
  "arrivalDate" VARCHAR(10),
  "departureDate" VARCHAR(10),
  "guestSummary" VARCHAR(255),
  "rawPayload" TEXT,
  "acknowledgementState" VARCHAR(50) NOT NULL DEFAULT 'RECEIVED',
  "acknowledgedAt" BIGINT,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL,
  PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_channex_booking_revision_account_revision
  ON main.channex_booking_revision ("integrationAccountId", "revisionId");

CREATE INDEX IF NOT EXISTS idx_channex_booking_revision_property
  ON main.channex_booking_revision ("domitsPropertyId", "externalPropertyId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_channex_booking_revision_reservation
  ON main.channex_booking_revision ("integrationAccountId", "externalReservationId", "createdAt" DESC);
