CREATE TABLE IF NOT EXISTS test.review (
  id VARCHAR(255) NOT NULL PRIMARY KEY,
  booking_id VARCHAR(255) NOT NULL,
  property_id VARCHAR(255) NOT NULL,
  host_id VARCHAR(255) NOT NULL,
  reviewer_user_id VARCHAR(255) NOT NULL,
  reviewee_user_id VARCHAR(255) NULL,
  review_type VARCHAR(50) NOT NULL,
  overall_rating NUMERIC(2, 1) NOT NULL,
  title VARCHAR(255) NOT NULL,
  public_review TEXT NOT NULL,
  private_feedback TEXT NULL,
  verification_status VARCHAR(50) NOT NULL DEFAULT 'UNVERIFIED',
  publication_status VARCHAR(50) NOT NULL DEFAULT 'UNPUBLISHED',
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS test.review_rating (
  id VARCHAR NOT NULL PRIMARY KEY,
  review_id VARCHAR NOT NULL,
  category VARCHAR NOT NULL,
  rating NUMERIC(2, 1) NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS test.review_category (
  id VARCHAR NOT NULL PRIMARY KEY,
  key VARCHAR NOT NULL,
  label VARCHAR NOT NULL,
  description TEXT NULL,
  review_type VARCHAR NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS test.review_request (
  id VARCHAR NOT NULL PRIMARY KEY,
  booking_id VARCHAR NOT NULL,
  property_id VARCHAR NOT NULL,
  host_id VARCHAR NOT NULL,
  guest_id VARCHAR NOT NULL,
  review_type VARCHAR NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'OPEN',
  requested_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL,
  completed_at BIGINT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  last_sent_at BIGINT NULL,
  next_send_at BIGINT NULL,
  claimed_at BIGINT NULL,
  send_count INTEGER NULL
);

CREATE UNIQUE INDEX ASYNC IF NOT EXISTS review_booking_type_reviewer_unique_test
ON test.review (booking_id, review_type, reviewer_user_id);

CREATE UNIQUE INDEX ASYNC IF NOT EXISTS review_request_booking_type_guest_unique_test
ON test.review_request (booking_id, review_type, guest_id);

CREATE TABLE IF NOT EXISTS main.review (
  id VARCHAR(255) NOT NULL PRIMARY KEY,
  booking_id VARCHAR(255) NOT NULL,
  property_id VARCHAR(255) NOT NULL,
  host_id VARCHAR(255) NOT NULL,
  reviewer_user_id VARCHAR(255) NOT NULL,
  reviewee_user_id VARCHAR(255) NULL,
  review_type VARCHAR(50) NOT NULL,
  overall_rating NUMERIC(2, 1) NOT NULL,
  title VARCHAR(255) NOT NULL,
  public_review TEXT NOT NULL,
  private_feedback TEXT NULL,
  verification_status VARCHAR(50) NOT NULL DEFAULT 'UNVERIFIED',
  publication_status VARCHAR(50) NOT NULL DEFAULT 'UNPUBLISHED',
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS main.review_rating (
  id VARCHAR NOT NULL PRIMARY KEY,
  review_id VARCHAR NOT NULL,
  category VARCHAR NOT NULL,
  rating NUMERIC(2, 1) NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS main.review_category (
  id VARCHAR NOT NULL PRIMARY KEY,
  key VARCHAR NOT NULL,
  label VARCHAR NOT NULL,
  description TEXT NULL,
  review_type VARCHAR NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS main.review_request (
  id VARCHAR NOT NULL PRIMARY KEY,
  booking_id VARCHAR NOT NULL,
  property_id VARCHAR NOT NULL,
  host_id VARCHAR NOT NULL,
  guest_id VARCHAR NOT NULL,
  review_type VARCHAR NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'OPEN',
  requested_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL,
  completed_at BIGINT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  last_sent_at BIGINT NULL,
  next_send_at BIGINT NULL,
  claimed_at BIGINT NULL,
  send_count INTEGER NULL
);

CREATE UNIQUE INDEX ASYNC IF NOT EXISTS review_booking_type_reviewer_unique
ON main.review (booking_id, review_type, reviewer_user_id);

CREATE UNIQUE INDEX ASYNC IF NOT EXISTS review_request_booking_type_guest_unique_main
ON main.review_request (booking_id, review_type, guest_id);
