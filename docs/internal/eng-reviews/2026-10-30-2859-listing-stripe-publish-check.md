# fix(#2859): align listing publish checks with Stripe

Pull request: #3743
Issue: #2859 (related), #2764 (related)
Reviewed commit: 693b421
Result: no blocking findings after the eligibility check was unified

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P1 (10/10) | `frontend/web/src/features/hostdashboard/hooks/useSetLiveEligibility.js:19-20` | Listing publish eligibility was derived from the separate host-verification endpoint (`verificationStatus === "verified"`) instead of the Stripe payout readiness used by Finance. A host with a completed Stripe account could therefore be rejected. | Fixed: read the Stripe account details and use the shared Stripe payout readiness predicate. |
| P2 (10/10) | `frontend/web/src/features/hostdashboard/HostListings.js:206-210` | A failed verification lookup and a genuinely incomplete payment setup both produced the same misleading bank-details error and Finance redirect. | Fixed: lookup errors now show a retry message; only an incomplete Stripe setup triggers the Finance redirect. |

## What already exists

Finance derives its connected/usable state from the Stripe account ID, onboarding completion, charge enablement and payout enablement. The Onboarding Go Live checklist also checks Stripe onboarding, charges and payouts. The change extracts this rule into `isStripePayoutSetupComplete` in the existing Stripe account service and reuses it in Listings and the onboarding checklist instead of introducing another status source.

## Failure modes

- Stripe lookup fails or times out: the hook returns ineligible, surfaces an explicit retry message and does not redirect the host as though bank details were missing. Covered by the hook error test.
- Stripe account is absent, onboarding is incomplete, charges are disabled or payouts are disabled: publishing remains blocked and Finance is the next step. Covered by the hook's negative cases and the onboarding payment-status tests.
- Stripe setup is complete: the hook allows the existing listing lifecycle update to run. Covered by the hook's positive case. The full card-to-API browser flow was not run in this environment.

## Not in scope

- The listing editor's separate status-dropdown path and server-side enforcement are not changed; they should be reviewed separately rather than broaden this focused card-action fix.
- The host-verification service remains available to other verification flows; only its use as a Stripe publish gate is removed.

## Data flow

```text
Host clicks "Set as live"
        |
        v
HostListings -> useSetLiveEligibility
        |
        v
Stripe account status endpoint
        |
        v
accountId + onboardingComplete + chargesEnabled + payoutsEnabled
        |
        +-- complete --> existing ACTIVE lifecycle update
        |
        +-- incomplete --> Finance redirect
        |
        +-- lookup error --> retry message, remain on Listings
```
