# Direct Booking volume commission implementation review

Issue: #3194  
Pull request: pending  
Date: 10 November 2026

## Implemented

- Commission applies only to bookings whose source is `STANDALONE_SITE`; marketplace and OTA payment calculations keep their existing behavior.
- The public quote's `nightlyBaseTotal` is saved in cents as the commissionable accommodation amount. Cleaning remains in the guest quote but is excluded from the commission base.
- Before an inquiry is accepted, the backend checks the host's paid standalone-site accommodation revenue over the preceding rolling 365 days, adds the current reservation, and selects 4.9%, 4.5% or 3.9%. Enterprise-tier rejection therefore leaves the inquiry untouched.
- The rolling revenue window uses the timestamp written when payment is successfully confirmed, not the original inquiry creation time.
- The guest is charged the signed quote total. Stripe's Connect application fee takes the host commission from the host transfer.
- The applied rate, fee, commissionable base, annual revenue and period start are stored on the booking as a historical snapshot and copied to Stripe metadata.
- The €5,000,000+ Enterprise tier is not assigned an invented rate; it returns a clear conflict until a custom rate is configured.

## Scope and follow-ups

- Revenue is based on paid reservations whose successful payment timestamp falls in the trailing 365-day window. Legacy standalone-site bookings without the new commissionable amount are not backfilled because their historic quote breakdown is not stored.
- This change does not yet add a separate commission ledger or automatic partial-refund adjustment entries. Existing cancellation/refund processing remains unchanged; finance reconciliation should handle those adjustments until the ledger work is scoped.
- The host-facing rate-plan page continues to show the standard 4.9% rate and the tier table; a live current-tier summary can be added separately.
