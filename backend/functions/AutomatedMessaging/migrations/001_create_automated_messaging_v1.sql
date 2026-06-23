CREATE TABLE IF NOT EXISTS main.message_automation (
  id VARCHAR(255) PRIMARY KEY,
  hostid VARCHAR(255) NOT NULL,
  propertyid VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  triggertype VARCHAR(50) NOT NULL CHECK (triggertype = 'BOOKING_PAID'),
  offsetamount INTEGER NOT NULL DEFAULT 0 CHECK (offsetamount >= 0),
  offsetunit VARCHAR(20) NOT NULL CHECK (offsetunit IN ('MINUTES', 'HOURS', 'DAYS')),
  template TEXT NOT NULL,
  channel VARCHAR(50) NOT NULL CHECK (channel = 'DOMITS_DIRECT'),
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'PAUSED')),
  createdat BIGINT NOT NULL,
  updatedat BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_message_automation_host
  ON main.message_automation (hostid, updatedat DESC);
CREATE INDEX IF NOT EXISTS idx_message_automation_active_trigger
  ON main.message_automation (hostid, propertyid, triggertype)
  WHERE status = 'ACTIVE';

CREATE TABLE IF NOT EXISTS main.message_automation_delivery (
  id VARCHAR(255) PRIMARY KEY,
  automationid VARCHAR(255) NOT NULL,
  bookingid VARCHAR(255) NOT NULL,
  eventtype VARCHAR(50) NOT NULL,
  eventversion INTEGER NOT NULL,
  scheduledfor BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED'
    CHECK (status IN ('SCHEDULED', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED')),
  messageid VARCHAR(255),
  failurereason TEXT,
  templatesnapshot TEXT NOT NULL,
  renderedcontent TEXT,
  idempotencykey VARCHAR(512) NOT NULL,
  createdat BIGINT NOT NULL,
  updatedat BIGINT NOT NULL,
  sentat BIGINT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_message_automation_delivery_event_unique
  ON main.message_automation_delivery (automationid, bookingid, eventtype, eventversion);
CREATE UNIQUE INDEX IF NOT EXISTS idx_message_automation_delivery_idempotency
  ON main.message_automation_delivery (idempotencykey);
CREATE INDEX IF NOT EXISTS idx_message_automation_delivery_due
  ON main.message_automation_delivery (status, scheduledfor);
CREATE INDEX IF NOT EXISTS idx_message_automation_delivery_automation
  ON main.message_automation_delivery (automationid, createdat DESC);

CREATE TABLE IF NOT EXISTS main.booking_automation_outbox (
  id VARCHAR(255) PRIMARY KEY,
  bookingid VARCHAR(255) NOT NULL,
  eventtype VARCHAR(50) NOT NULL CHECK (eventtype = 'BOOKING_PAID'),
  eventversion INTEGER NOT NULL,
  occurredat BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED')),
  attemptcount INTEGER NOT NULL DEFAULT 0,
  failurereason TEXT,
  createdat BIGINT NOT NULL,
  updatedat BIGINT NOT NULL,
  processedat BIGINT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_automation_outbox_event_unique
  ON main.booking_automation_outbox (bookingid, eventtype, eventversion);
CREATE INDEX IF NOT EXISTS idx_booking_automation_outbox_pending
  ON main.booking_automation_outbox (status, occurredat);

ALTER TABLE main.unified_message
  ADD COLUMN IF NOT EXISTS automationdeliveryid VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unified_message_automation_delivery_unique
  ON main.unified_message (automationdeliveryid)
  WHERE automationdeliveryid IS NOT NULL;
