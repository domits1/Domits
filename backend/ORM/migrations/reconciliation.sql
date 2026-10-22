-- Read-only report. Bind stale_before_epoch_ms to an investigation threshold.
-- Confirm delivery against EmailNotificationService logs before any manual retry.
SELECT id, booking_id, status, claimed_at, last_sent_at, updated_at, send_count
FROM main.review_request
WHERE status = 'FAILED'
   OR (status = 'SENDING' AND claimed_at < :stale_before_epoch_ms)
ORDER BY updated_at ASC;
