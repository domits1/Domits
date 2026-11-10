SELECT table_schema, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'booking'
  AND table_schema IN ('main', 'test')
  AND column_name = 'refund_status'
ORDER BY table_schema ASC;

SELECT job_id, status, job_type, object_name, update_time
FROM sys.jobs
WHERE status IN ('submitted', 'processing');

ALTER TABLE test.booking ADD COLUMN IF NOT EXISTS refund_status VARCHAR(32);
ALTER TABLE main.booking ADD COLUMN IF NOT EXISTS refund_status VARCHAR(32);

UPDATE test.booking
SET refund_status = 'unknown'
WHERE LOWER(status) IN ('cancelled', 'canceled')
  AND refund_status IS NULL
  AND (
    (paymentid IS NOT NULL AND TRIM(paymentid) <> '' AND paymentid NOT LIKE 'FAILED%')
    OR stripe_refund_id IS NOT NULL
    OR COALESCE(refunded_amount, 0) > 0
    OR refund_error IS NOT NULL
  );

UPDATE main.booking
SET refund_status = 'unknown'
WHERE LOWER(status) IN ('cancelled', 'canceled')
  AND refund_status IS NULL
  AND (
    (paymentid IS NOT NULL AND TRIM(paymentid) <> '' AND paymentid NOT LIKE 'FAILED%')
    OR stripe_refund_id IS NOT NULL
    OR COALESCE(refunded_amount, 0) > 0
    OR refund_error IS NOT NULL
  );

SELECT table_schema, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'booking'
  AND table_schema IN ('main', 'test')
  AND column_name = 'refund_status'
ORDER BY table_schema ASC;

