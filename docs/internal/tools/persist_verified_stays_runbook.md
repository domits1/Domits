# Persist completed-stay verification

Release baseline: `acceptance`.

## Before merge / release

Run `backend/ORM/migrations/20261126_persist_verified_stays_preflight.sql` read-only
against the intended database. It reports eligible backfill counts and published
reviews that cannot be backfilled, grouped by current booking status, for `test`
and `main`. Save the output in the release record. Cancelled/refunded bookings,
missing bookings, identity mismatches and invalid checkout dates require review.
Existing VERIFIED_STAY records are preserved and are not counted as exclusions.

Do not release with unexplained exclusions. Recover trusted historical booking
or submission evidence and reconcile those reviews before restoring traffic, or
record the affected counts and an explicit release-owner decision accepting their
exclusion. Never infer verification from a cancelled/refunded status alone. These
records remain stored; the migration does not delete them.

## Deployment and backfill

Complete the backfill before or as part of the merge deployment, before public
traffic reaches the new backend. If deployment precedes backfill, hold public
traffic throughout. The repository does not automatically run migrations.

Run the statement for the intended schema in
`backend/ORM/migrations/20261126_persist_verified_stays.sql` repeatedly, committing
each execution separately, until RETURNING yields zero rows. Each execution updates
at most 500 rows, below DSQL's 3,000-row transaction limit. Never wrap batches or
schemas in one transaction. Smaller batches may be needed if the 10 MiB write or
transaction-duration limits are reached. On a transient conflict, retry the failed
batch. Completed batches are safe to rerun; eligibility excludes persisted evidence.

Alternatively, the JavaScript migration loops the same batches. Configure TypeORM
with `migrationsTransactionMode: "each"` or `"none"`; its `transaction = false`
requires independent commits, and it rejects an already active transaction.
Both files include `test` and `main`; the SQL path lets operators select only the
schema intended for that environment. No schema changes are needed.

Rerun preflight: eligible count must be zero. Compare excluded counts with the
recorded decision. Then restore traffic. Existing unverified reviews are hidden
until backfilled; score/count also depend on the stored evidence.

## Resulting behavior

Creation validates a matching paid/confirmed booking after checkout and stores
VERIFIED_STAY. Older drafts are validated when submitted; submission persists the
same evidence. Approval/publication retain that evidence, so later cancellation
or refund cannot hide an already verified review. Moderation, authorization and
version checks still apply. Backfill advances updated_at to prevent stale writes.

Public reviews and host performance, history, category ratings, trends and overall
score require VERIFIED_STAY alongside their existing publication/rating rules.
Time ranges, ownership and active-property requirements remain endpoint-specific.
There is no destructive automatic rollback.

## Acceptance checks

Publish a verified review and confirm its badge, tooltip, score and count. Cancel
or refund its booking after checkout and confirm the review, score and count stay
unchanged. Confirm unpublished/unverified reviews are excluded from public and host
aggregates. Check mobile, tablet and desktop layouts. Local component evidence does
not replace this live database/UI flow.

Live database preflight counts and cancellation/refund integration checks have not
been executed by source tests; they remain release prerequisites.
