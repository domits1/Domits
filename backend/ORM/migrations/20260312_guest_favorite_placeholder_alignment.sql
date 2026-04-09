-- 2026-03-12 guest_favorite placeholder alignment (schema: main)
-- Purpose:
-- 1) Allow placeholder rows (propertyId NULL) for empty wishlists.
-- 2) Enforce consistent row shape via a check constraint.

-- =========================
-- Migration SQL (UP)
-- =========================
ALTER TABLE main.guest_favorite
DROP CONSTRAINT IF EXISTS guest_favorite_property_placeholder_chk;

ALTER TABLE main.guest_favorite
ALTER COLUMN propertyId DROP NOT NULL;

UPDATE main.guest_favorite
SET isPlaceholder = CASE WHEN propertyId IS NULL THEN TRUE ELSE FALSE END;

ALTER TABLE main.guest_favorite
ADD CONSTRAINT guest_favorite_property_placeholder_chk
CHECK (
  (isPlaceholder = TRUE AND propertyId IS NULL) OR
  (isPlaceholder = FALSE AND propertyId IS NOT NULL)
);

-- =========================
-- Verification SQL
-- =========================
-- Confirm column nullability in schema main:
SELECT table_schema, table_name, column_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'main'
  AND table_name = 'guest_favorite'
  AND column_name = 'propertyid';

-- Confirm constraint exists:
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conname = 'guest_favorite_property_placeholder_chk';

-- Confirm data currently satisfies expected contract:
SELECT
  SUM(CASE WHEN isPlaceholder = TRUE AND propertyId IS NULL THEN 1 ELSE 0 END) AS valid_placeholders,
  SUM(CASE WHEN isPlaceholder = FALSE AND propertyId IS NOT NULL THEN 1 ELSE 0 END) AS valid_items,
  SUM(CASE WHEN (isPlaceholder = TRUE AND propertyId IS NOT NULL) OR (isPlaceholder = FALSE AND propertyId IS NULL) THEN 1 ELSE 0 END) AS invalid_rows
FROM main.guest_favorite;

-- =========================
-- Rollback SQL (DOWN)
-- =========================
ALTER TABLE main.guest_favorite
DROP CONSTRAINT IF EXISTS guest_favorite_property_placeholder_chk;

UPDATE main.guest_favorite
SET propertyId = '__placeholder__'
WHERE propertyId IS NULL;

ALTER TABLE main.guest_favorite
ALTER COLUMN propertyId SET NOT NULL;

-- =========================
-- Smoke Test SQL
-- =========================
-- Run in a transaction and ROLLBACK to avoid permanent test rows.
BEGIN;

INSERT INTO main.guest_favorite (guestId, wishlistKey, isPlaceholder, propertyId, wishlistName)
VALUES ('smoke-guest', 'Smoke list#__placeholder__', TRUE, NULL, 'Smoke list')
ON CONFLICT (guestId, wishlistKey) DO NOTHING;

INSERT INTO main.guest_favorite (guestId, wishlistKey, isPlaceholder, propertyId, wishlistName)
VALUES ('smoke-guest', 'Smoke list#property-1', FALSE, 'property-1', 'Smoke list')
ON CONFLICT (guestId, wishlistKey) DO NOTHING;

SELECT guestId, wishlistKey, isPlaceholder, propertyId, wishlistName
FROM main.guest_favorite
WHERE guestId = 'smoke-guest'
ORDER BY wishlistKey;

ROLLBACK;
