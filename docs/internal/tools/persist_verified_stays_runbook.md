# Persist completed-stay verification

Deploy the ReviewSystem backend with public traffic held, then run each statement in
`backend/ORM/migrations/20261126_persist_verified_stays.sql` separately against the intended database
before restoring traffic. The repository does not automatically run these migrations.
Both `test` and `main` are included; select the schema appropriate to the environment.
No schema changes are needed.

New reviews store `VERIFIED_STAY` after completed-booking validation. Submission also records
that status in its existing validated transaction for older unverified drafts. Later approval
and publication retain the evidence without rechecking mutable booking status; authorization,
moderation and version checks still apply. Public score, count and page queries require
stored `VERIFIED_STAY` and retain publication and active-property checks. They no longer depend
on mutable booking status. The backfill records eligible existing guest reviews and advances
their version to prevent stale writes. It is safe to rerun and preserves existing verification.

Existing unverified reviews whose bookings were already cancelled or refunded cannot be
verified from current booking data. Recover historical evidence and review those records
separately; do not mark them verified without evidence. There is no destructive automatic rollback.

On acceptance, verify a published review is visible with its badge and included in score/count.
Cancel or refund its booking after checkout, reload, and confirm all three remain unchanged.
Also confirm unpublished and unverified reviews remain excluded. This live database/UI check
has not been executed by the source tests.
