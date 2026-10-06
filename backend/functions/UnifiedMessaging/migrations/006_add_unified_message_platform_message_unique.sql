CREATE UNIQUE INDEX IF NOT EXISTS idx_unified_message_platform_message_unique
  ON main.unified_message (threadId, platformMessageId)
  WHERE platformMessageId IS NOT NULL;
