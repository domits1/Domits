# #2446 - Database Table Research (Updated)

Last verified: 2026-03-02  
Scope: repository-level validation against current ORM models, SQL schema files, and backend repository usage.

## Validation Sources

- `backend/ORM/models/*`
- `backend/ORM/schema.psql`
- `backend/functions/PropertyHandler/data/repository/*`
- `backend/functions/UnifiedMessaging/data/*`
- `backend/functions/UnifiedMessaging/migrations/002_add_unified_messaging_schema.sql`
- `backend/functions/Distribution_API/data/repository.js`
- `backend/functions/testingNewOrm/data/repository.js`
- `backend/functions/General-Payments-Production-CRUD-fetchHostPayout/data/propertyRepository.js`

---

## Cluster 1 - Amenities

### Current Tables

1. `amenities`
2. `amenity_categories`
3. `amenity_and_category`
4. `property_amenity`

### Verified Structure

`amenities`
- `amenity` (PK, varchar)

`amenity_categories`
- `category` (PK, varchar)

`amenity_and_category`
- `id` (PK, varchar)
- `amenity` (varchar)
- `category` (varchar)
- `"eco-score"` (varchar)

`property_amenity`
- `id` (PK, varchar)
- `amenityid` (varchar)
- `property_id` (varchar)

### Verified Behavior

- `property_amenity.amenityid` is logically treated as `amenity_and_category.id` in code.
- `replaceAmenitiesByPropertyId` validates incoming amenity IDs against `amenity_and_category.id`.
- There is an index on `property_amenity(amenityId)` in SQL (`fk_property_amenity_amenity_and_category_idx`), which supports this logical link.

### Risks / Gaps

1. String-based keys are used heavily.
2. `"eco-score"` column naming is awkward for SQL and ORM mapping.
3. No DB-level foreign keys (Aurora DSQL limitation), so integrity remains app-enforced.
4. Junction uniqueness (`property_id`, `amenityid`) is not enforced in DB.

### Decision

| Table | Decision | Reason |
|------|------|------|
| amenities | KEEP (review usage) | Reference table exists but direct repository usage is limited |
| amenity_categories | KEEP (review usage) | Same as above |
| amenity_and_category | KEEP for now | Active source for amenity IDs |
| property_amenity | KEEP (refactor later) | Active mapping table |

---

## Cluster 2 - Rules

### Current Tables

1. `rules`
2. `property_rule`

### Verified Structure

`rules`
- `rule` (PK, varchar)

`property_rule`
- `property_id` (PK, varchar)
- `rule` (PK, varchar)
- `value` (boolean)

### Verified Behavior

- `propertyRuleRepository.replaceRulesByPropertyId` validates rule names against `rules.rule`.
- The composite PK already prevents duplicates for (`property_id`, `rule`).

### Risks / Gaps

1. String PKs instead of ID-based keys.
2. No metadata on `rules` (for example description/grouping).

### Decision

| Table | Decision | Reason |
|------|------|------|
| rules | KEEP (possible ID refactor later) | Actively used and validated |
| property_rule | KEEP | Correct junction model and active usage |

---

## Cluster 3 - Property Types

### Current Tables

1. `property_types`
2. `property_type`

### Verified Structure

`property_types`
- `type` (PK, varchar)

`property_type`
- `property_id` (PK, varchar)
- `type` (varchar)
- `spacetype` (varchar)

### Verified Behavior

- `property_types` is used to validate allowed types.
- `property_type` is used as the property-level assignment table.
- Because `property_id` is PK, each property can only have one type row.

### Risks / Gaps

1. String-based type values.
2. One-to-one relation implemented via separate table adds complexity.

### Decision

| Table | Decision | Reason |
|------|------|------|
| property_types | KEEP (refactor candidate) | Active type reference list |
| property_type | KEEP for now | Active in PropertyHandler workflows |

Note: merging `type` and `spacetype` into `property` is possible, but only with coordinated migration + code updates.

---

## Cluster 4 - Pricing and Availability

### Current Tables

1. `property_pricing`
2. `property_availability`
3. `availability_restrictions`
4. `property_availabilityrestriction`
5. `property_calendar_price` (schema table, no ORM model)

### Verified Structure

`property_pricing`
- `property_id` (PK, varchar)
- `cleaning` (int, nullable)
- `roomrate` (int, not null)

`property_availability`
- `property_id` (PK part, varchar)
- `availablestartdate` (PK part, bigint)
- `availableenddate` (bigint)

`availability_restrictions`
- `restriction` (PK, varchar)

`property_availabilityrestriction`
- `id` (PK, varchar)
- `property_id` (varchar)
- `restriction` (varchar)
- `value` (int)

`property_calendar_price`
- Present in SQL schema (`backend/ORM/schema.psql`)
- Not present as an ORM model in `backend/ORM/models`
- Referenced in property deletion cleanup logic

### Verified Behavior

- Availability and restriction repositories exist and are actively used.
- Restriction names are validated against `availability_restrictions`.
- No DB constraint prevents overlapping availability ranges.
- No DB unique on (`property_id`, `restriction`) for `property_availabilityrestriction`.

### Risks / Gaps

1. Unclear monetary unit contract (`int` should be explicitly documented as cents if intended).
2. No overlap prevention for availability ranges.
3. Missing unique constraint on (`property_id`, `restriction`) in restriction mapping table.
4. `property_calendar_price` is partially represented (schema exists, model missing).

### Decision

| Table | Decision | Reason |
|------|------|------|
| property_pricing | KEEP (standardize money format) | Active baseline pricing |
| property_availability | KEEP (add range policy) | Active range storage |
| availability_restrictions | KEEP | Active reference table |
| property_availabilityrestriction | KEEP (add uniqueness) | Active property restriction table |
| property_calendar_price | KEEP/clarify ownership | Exists in schema and cleanup flow, but missing model |

---

## Cluster 5 - General Details

### Current Tables

1. `general_details`
2. `property_generaldetail`

### Verified Structure

`general_details`
- `detail` (PK, varchar)

`property_generaldetail`
- `id` (PK, varchar)
- `property_id` (varchar)
- `detail` (varchar)
- `value` (int)

### Verified Behavior

- Repository validates values as numbers and writes integer values.
- Upsert behavior is implemented in application code by checking existing (`property_id`, `detail`) rows.

### Risks / Gaps

1. No DB-level unique on (`property_id`, `detail`) despite app-level upsert logic.
2. String detail keys are vulnerable to drift if app validation changes.

### Decision

| Table | Decision | Reason |
|------|------|------|
| general_details | KEEP (refactor candidate) | Active reference list |
| property_generaldetail | KEEP (add DB unique) | Active value table |

---

## Cluster 6 - Images

### Current Tables

1. `property_image` (legacy)
2. `property_image_v2`
3. `property_image_variant`

### Verified Structure

`property_image` (legacy)
- Composite PK: `property_id`, `key`
- Additional SQL index currently exists as unique on `property_id`

`property_image_v2`
- `id` (PK, varchar)
- `property_id` (varchar)
- `sort_order` (int)
- `status` (varchar)
- `created_at` (bigint)
- `updated_at` (bigint)

`property_image_variant`
- `id` (PK, varchar)
- `image_id` (varchar)
- `variant` (varchar)
- `s3_key` (varchar)
- `content_type` (varchar)
- `bytes`, `width`, `height` (nullable ints)
- DB unique on (`image_id`, `variant`)

### Verified Behavior

- PropertyHandler actively reads and writes both v2 and legacy image tables.
- `getImagesByPropertyId` first tries v2 + variants, then falls back to legacy.
- Legacy write path (`create`) still exists.
- Payout repository uses `COALESCE(variant.s3_key, legacy.key)`, so both sources are still live in read paths.

### Risks / Gaps

1. Two active data sources for images.
2. Legacy table has a unique index on `property_id`, which can conflict with multi-image expectations.
3. No explicit final migration cutoff from legacy to v2.

### Decision

| Table | Decision | Reason |
|------|------|------|
| property_image_v2 | KEEP (canonical target) | Active modern model |
| property_image_variant | KEEP | Required for variant storage |
| property_image (legacy) | KEEP for now, then deprecate | Still used in active code paths |

---

## Cluster 7 - Unified Messaging

### Current Tables

1. `unified_thread`
2. `unified_message`

### Verified Structure

`unified_thread`
- `id` (PK)
- `hostId`, `guestId`
- `propertyId` (nullable)
- `platform`
- `externalThreadId` (nullable)
- `status` (default `OPEN`)
- `createdAt`, `updatedAt`, `lastMessageAt` (bigint)

`unified_message`
- `id` (PK)
- `threadId`
- `senderId`, `recipientId`
- `content` (text)
- `platformMessageId` (nullable)
- `createdAt` (bigint)
- `isRead` (boolean, default false)
- `metadata` (text)
- `attachments` (text JSON)
- `deliveryStatus` (varchar, default `pending`)

### Verified Behavior

- UnifiedMessaging repositories actively create and query these tables.
- Existing indexes already include:
  - `idx_unified_thread_host`
  - `idx_unified_thread_platform` (`platform`, `externalThreadId`)
  - `idx_unified_message_thread` (`threadId`)

### Risks / Gaps

1. JSON stored as text reduces queryability.
2. Depending on query patterns, extra index on `guestId` and/or time-based fields may still be needed.

### Decision

| Table | Decision | Reason |
|------|------|------|
| unified_thread | KEEP | Active canonical thread table |
| unified_message | KEEP | Active canonical message table |

---

## Cluster 8 - property_test_status

### Current Tables

1. `property_test_status`

### Verified Structure

`property_test_status`
- `property_id` (PK, varchar)
- `istest` (boolean)

### Verified Behavior

- PropertyHandler actively creates and reads `property_test_status`.
- It is part of both create flow and property fetch flows.

### Risks / Gaps

1. One-to-one boolean in a separate table adds join and migration complexity.

### Decision

| Table | Decision | Reason |
|------|------|------|
| property_test_status | KEEP for now, merge candidate later | Active runtime usage today |

---

## Cluster 9 - user_table

### Current Tables

1. `user_table`

### Verified Structure

`user_table`
- `username` (PK, varchar)
- `password` (varchar)

### Verified Behavior

- There are active code references to `User_Table` in:
  - `backend/functions/Distribution_API/data/repository.js`
  - `backend/functions/testingNewOrm/data/repository.js`
- Frontend and multiple backend services also use Cognito/Amplify authentication flows.

### Risks / Gaps

1. Storing passwords in app DB is high-risk if Cognito is the intended source of truth.
2. Current repository references mean this table cannot be marked as "unused" without runtime traffic and ownership checks.

### Decision

| Table | Decision | Reason |
|------|------|------|
| user_table | DEPRECATE candidate only after usage audit | Code references still exist |

---

## Extra Checks

### availability_restriction vs availability_restrictions

- `availability_restrictions` exists and is used.
- `property_availabilityrestriction` exists and is used.
- Singular `availability_restriction` model/table naming was not found in ORM models.

### property_calendar_price

- Table exists in SQL schema.
- No ORM model exists in `backend/ORM/models`.
- Property deletion flow includes cleanup for this table.
- This is not "missing"; it is partially represented in current code.

---

## Cross-Cluster Findings

1. String primary keys are common and increase drift risk.
2. Several junction tables rely on app-level checks instead of DB constraints.
3. Aurora DSQL design means no DB foreign keys, so integrity must be explicit in service/repository logic.
4. Some tables are in a transitional state (`property_image`, `property_image_v2`, `property_calendar_price` representation gap).

---

## Rollout Framing for Any Backend/Data Refactor

### 1. Acceptance Code Deploy Steps

- Deploy backward-compatible code first.
- Ensure code can handle both old and new shapes during transition.
- Avoid shipping code that only works after destructive schema changes.

### 2. Aurora `main` SQL Steps

- Apply idempotent DDL/DML in `main`.
- Include verification SQL after each change.
- Include rollback/cleanup SQL where feasible.

### 3. Smoke Tests

- API smoke tests for create/read/update/delete flows touching changed tables.
- UI smoke tests for onboarding, property editing, pricing/availability, messaging, and images.

### 4. Production Rollout Notes

- Repeat acceptance-proven sequence in production.
- Keep expand/contract migration order.
- Only remove old columns/tables after metrics and logs confirm zero dependency.

---

## Summary

- The previous research was directionally good on most table shapes.
- Key corrections are now applied:
  1. `user_table` is referenced in code, so "unused" was incorrect.
  2. Unified messaging indexes already exist.
  3. `property_calendar_price` exists in schema and cleanup logic.
  4. Legacy image table is still active and cannot be dropped yet.
- This document is now English-only and aligned with current repository state.
