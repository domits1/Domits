-- Table main.unified_thread
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS main.unified_thread (
  id VARCHAR(255) NOT NULL,
  hostId VARCHAR(255) NOT NULL,
  guestId VARCHAR(255) NOT NULL,
  propertyId VARCHAR(255),
  platform VARCHAR(50) NOT NULL, -- 'DOMITS', 'AIRBNB', 'BOOKING', 'VRBO'
  externalThreadId VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
  createdAt BIGINT NOT NULL,
  updatedAt BIGINT NOT NULL,
  lastMessageAt BIGINT,
  PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS id_unified_thread_UNIQUE ON main.unified_thread (id);
CREATE INDEX IF NOT EXISTS idx_unified_thread_host ON main.unified_thread (hostId);
CREATE INDEX IF NOT EXISTS idx_unified_thread_platform ON main.unified_thread (platform, externalThreadId);

-- Table main.unified_message
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS main.unified_message (
  id VARCHAR(255) NOT NULL,
  threadId VARCHAR(255) NOT NULL,
  senderId VARCHAR(255) NOT NULL,
  recipientId VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  platformMessageId VARCHAR(255),
  createdAt BIGINT NOT NULL,
  isRead BOOLEAN DEFAULT FALSE,
  metadata TEXT, -- JSON string for extra data
  PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS id_unified_message_UNIQUE ON main.unified_message (id);
CREATE INDEX IF NOT EXISTS idx_unified_message_thread ON main.unified_message (threadId);

