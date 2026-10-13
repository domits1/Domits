SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema IN ('main', 'test')
  AND table_name = 'guest_risk_assessment'
ORDER BY table_schema ASC;

CREATE TABLE IF NOT EXISTS test.guest_risk_assessment (
    id VARCHAR(255) PRIMARY KEY,
    provider VARCHAR(50) NOT NULL,
    bookingid VARCHAR(255) NOT NULL,
    providerassessmentid VARCHAR(255),
    status VARCHAR(30) NOT NULL,
    flaggedreason TEXT,
    errormessage TEXT,
    createdat BIGINT NOT NULL,
    updatedat BIGINT NOT NULL
);

CREATE INDEX ASYNC IF NOT EXISTS guest_risk_assessment_bookingid_idx_test
ON test.guest_risk_assessment (bookingid);

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE 'test.guest_risk_assessment%'
ORDER BY update_time ASC;

CREATE TABLE IF NOT EXISTS main.guest_risk_assessment (
    id VARCHAR(255) PRIMARY KEY,
    provider VARCHAR(50) NOT NULL,
    bookingid VARCHAR(255) NOT NULL,
    providerassessmentid VARCHAR(255),
    status VARCHAR(30) NOT NULL,
    flaggedreason TEXT,
    errormessage TEXT,
    createdat BIGINT NOT NULL,
    updatedat BIGINT NOT NULL
);

CREATE INDEX ASYNC IF NOT EXISTS guest_risk_assessment_bookingid_idx
ON main.guest_risk_assessment (bookingid);

SELECT job_id, status, details, job_type, object_name, update_time
FROM sys.jobs
WHERE object_name LIKE 'main.guest_risk_assessment%'
ORDER BY update_time ASC;

SELECT table_schema, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema IN ('main', 'test')
  AND table_name = 'guest_risk_assessment'
ORDER BY table_schema ASC, column_name ASC;

BEGIN;
INSERT INTO test.guest_risk_assessment (id, provider, bookingid, status, createdat, updatedat)
VALUES ('truvi:smoke-test', 'truvi', 'smoke-test', 'PASSED', 1790000000000, 1790000000000);
SELECT id, provider, bookingid, status FROM test.guest_risk_assessment WHERE id = 'truvi:smoke-test';
ROLLBACK;

BEGIN;
INSERT INTO main.guest_risk_assessment (id, provider, bookingid, status, createdat, updatedat)
VALUES ('truvi:smoke-test', 'truvi', 'smoke-test', 'PASSED', 1790000000000, 1790000000000);
SELECT id, provider, bookingid, status FROM main.guest_risk_assessment WHERE id = 'truvi:smoke-test';
ROLLBACK;

SELECT 'test' AS schema_name, count(*) AS should_be_zero FROM test.guest_risk_assessment
UNION ALL
SELECT 'main' AS schema_name, count(*) AS should_be_zero FROM main.guest_risk_assessment;