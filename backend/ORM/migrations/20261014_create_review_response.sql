CREATE TABLE IF NOT EXISTS test.review_response (
  id VARCHAR NOT NULL PRIMARY KEY,
  review_id VARCHAR NOT NULL,
  author_id VARCHAR NOT NULL,
  author_role VARCHAR NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'draft',
  message TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  published_at BIGINT NULL,
  deleted_at BIGINT NULL
);
CREATE INDEX ASYNC IF NOT EXISTS review_response_review_id_test ON test.review_response (review_id);

CREATE TABLE IF NOT EXISTS main.review_response (
  id VARCHAR NOT NULL PRIMARY KEY,
  review_id VARCHAR NOT NULL,
  author_id VARCHAR NOT NULL,
  author_role VARCHAR NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'draft',
  message TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  published_at BIGINT NULL,
  deleted_at BIGINT NULL
);
CREATE INDEX ASYNC IF NOT EXISTS review_response_review_id ON main.review_response (review_id);
