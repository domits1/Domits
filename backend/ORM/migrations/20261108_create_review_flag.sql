CREATE TABLE IF NOT EXISTS test.review_flag (
        id VARCHAR PRIMARY KEY,
        review_id VARCHAR NOT NULL,
        flagged_by VARCHAR NOT NULL,
        reason VARCHAR NOT NULL,
        notes TEXT,
        status VARCHAR NOT NULL DEFAULT 'PENDING',
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        resolved_by VARCHAR
      );

CREATE UNIQUE INDEX ASYNC IF NOT EXISTS review_flag_pending_unique_test
        ON test.review_flag (review_id) WHERE status = 'PENDING';

CREATE INDEX ASYNC IF NOT EXISTS review_flag_queue_test
        ON test.review_flag (status, created_at, id);

CREATE TABLE IF NOT EXISTS main.review_flag (
        id VARCHAR PRIMARY KEY,
        review_id VARCHAR NOT NULL,
        flagged_by VARCHAR NOT NULL,
        reason VARCHAR NOT NULL,
        notes TEXT,
        status VARCHAR NOT NULL DEFAULT 'PENDING',
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        resolved_by VARCHAR
      );

CREATE UNIQUE INDEX ASYNC IF NOT EXISTS review_flag_pending_unique
        ON main.review_flag (review_id) WHERE status = 'PENDING';

CREATE INDEX ASYNC IF NOT EXISTS review_flag_queue
        ON main.review_flag (status, created_at, id);
