-- -----------------------------------------------------
-- Table main.messaging_preference
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS main.messaging_preference (
  id VARCHAR(255) NOT NULL,
  "userId" VARCHAR(255) NOT NULL,
  "guestMessageEmailEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "autoReplyEmailEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "defaultResponseTimeTargetMinutes" INT,
  "businessHoursEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "businessHoursStart" TIME,
  "businessHoursEnd" TIME,
  "outOfOfficeEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "defaultMessageLanguage" VARCHAR(16) NOT NULL DEFAULT 'en',
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL,
  PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS id_messaging_preference_unique ON main.messaging_preference (id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_messaging_preference_user_unique ON main.messaging_preference ("userId");

-- -----------------------------------------------------
-- Table main.messaging_template
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS main.messaging_template (
  id VARCHAR(255) NOT NULL,
  "userId" VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(255),
  language VARCHAR(16) NOT NULL DEFAULT 'en',
  content TEXT NOT NULL,
  "isArchived" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL,
  PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS id_messaging_template_unique ON main.messaging_template (id);
CREATE INDEX IF NOT EXISTS idx_messaging_template_user ON main.messaging_template ("userId");
CREATE INDEX IF NOT EXISTS idx_messaging_template_user_archived ON main.messaging_template ("userId", "isArchived");

-- -----------------------------------------------------
-- Table main.messaging_auto_reply_rule
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS main.messaging_auto_reply_rule (
  id VARCHAR(255) NOT NULL,
  "userId" VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  channel VARCHAR(64) NOT NULL,
  "keywordPattern" TEXT NOT NULL,
  "replyTemplateId" VARCHAR(255),
  "replyText" TEXT,
  "isEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL,
  CONSTRAINT messaging_auto_reply_rule_reply_source_chk
    CHECK (
      (
        "replyTemplateId" IS NOT NULL AND ("replyText" IS NULL OR BTRIM("replyText") = '')
      ) OR (
        "replyTemplateId" IS NULL AND ("replyText" IS NOT NULL AND BTRIM("replyText") <> '')
      )
    ),
  PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS id_messaging_auto_reply_rule_unique ON main.messaging_auto_reply_rule (id);
CREATE INDEX IF NOT EXISTS idx_messaging_auto_reply_rule_user ON main.messaging_auto_reply_rule ("userId");
CREATE INDEX IF NOT EXISTS idx_messaging_auto_reply_rule_user_enabled ON main.messaging_auto_reply_rule ("userId", "isEnabled");
