SELECT table_schema, column_name
FROM information_schema.columns
WHERE table_name = 'guest_risk_assessment'
  AND table_schema IN ('main', 'test')
  AND column_name = 'failedattempts'
ORDER BY table_schema ASC;

ALTER TABLE test.guest_risk_assessment ADD COLUMN IF NOT EXISTS failedattempts INTEGER;

ALTER TABLE main.guest_risk_assessment ADD COLUMN IF NOT EXISTS failedattempts INTEGER;

SELECT table_schema, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'guest_risk_assessment'
  AND table_schema IN ('main', 'test')
  AND column_name = 'failedattempts'
ORDER BY table_schema ASC;

BEGIN;

INSERT INTO test.guest_risk_assessment (id, provider, bookingid, status, failedattempts, createdat, updatedat)
VALUES ('truvi:smoke-failed-attempts', 'truvi', 'smoke-failed-attempts', 'PASSED', 2, 1788912000000, 1788912000000);

SELECT id, failedattempts FROM test.guest_risk_assessment WHERE id = 'truvi:smoke-failed-attempts';

ROLLBACK;

SELECT COUNT(*) AS smoke_rows FROM test.guest_risk_assessment WHERE id = 'truvi:smoke-failed-attempts';
