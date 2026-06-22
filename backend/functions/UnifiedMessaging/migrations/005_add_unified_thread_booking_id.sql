ALTER TABLE main.unified_thread ADD COLUMN IF NOT EXISTS bookingId VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_unified_thread_booking ON main.unified_thread (bookingId);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unified_thread_domits_booking_unique
  ON main.unified_thread (bookingId)
  WHERE bookingId IS NOT NULL AND platform = 'DOMITS';
