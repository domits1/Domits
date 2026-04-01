ALTER TABLE main.messaging_preference
ADD COLUMN IF NOT EXISTS "dailyReminderEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "dailyReminderTime" TIME,
ADD COLUMN IF NOT EXISTS "dailyReminderTimezone" VARCHAR(64);

CREATE TABLE IF NOT EXISTS main.messaging_scheduler_rule (
  id VARCHAR(255) NOT NULL,
  "userId" VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  channel VARCHAR(64) NOT NULL,
  "templateId" VARCHAR(255) NOT NULL,
  "triggerType" VARCHAR(64) NOT NULL,
  "offsetUnit" VARCHAR(32),
  "offsetValue" INT,
  "isEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "skipIfGuestResponded" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL,
  PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS id_messaging_scheduler_rule_unique ON main.messaging_scheduler_rule (id);
CREATE INDEX IF NOT EXISTS idx_messaging_scheduler_rule_user ON main.messaging_scheduler_rule ("userId");
CREATE INDEX IF NOT EXISTS idx_messaging_scheduler_rule_user_enabled ON main.messaging_scheduler_rule ("userId", "isEnabled");

CREATE TABLE IF NOT EXISTS main.messaging_scheduler_execution_log (
  id VARCHAR(255) NOT NULL,
  "executionType" VARCHAR(64) NOT NULL,
  "userId" VARCHAR(255) NOT NULL,
  "schedulerRuleId" VARCHAR(255),
  "bookingId" VARCHAR(255),
  "threadId" VARCHAR(255),
  "messageId" VARCHAR(255),
  "uniqueKey" VARCHAR(255) NOT NULL,
  status VARCHAR(64) NOT NULL,
  details TEXT,
  "scheduledFor" BIGINT,
  "executedAt" BIGINT,
  "createdAt" BIGINT NOT NULL,
  PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS id_messaging_scheduler_execution_log_unique ON main.messaging_scheduler_execution_log (id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_messaging_scheduler_execution_log_unique_key ON main.messaging_scheduler_execution_log ("uniqueKey");
CREATE INDEX IF NOT EXISTS idx_messaging_scheduler_execution_log_thread_type ON main.messaging_scheduler_execution_log ("threadId", "executionType");

CREATE TABLE IF NOT EXISTS main.messaging_reservation_automation_pause (
  id VARCHAR(255) NOT NULL,
  "userId" VARCHAR(255) NOT NULL,
  "bookingId" VARCHAR(255) NOT NULL,
  "schedulerRuleId" VARCHAR(255),
  "isPaused" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL,
  PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS id_messaging_reservation_automation_pause_unique ON main.messaging_reservation_automation_pause (id);
CREATE INDEX IF NOT EXISTS idx_messaging_reservation_automation_pause_lookup ON main.messaging_reservation_automation_pause ("userId", "bookingId", "schedulerRuleId");
