# Direct Booking Website Naming

## Purpose

This note defines the current naming standard for the Direct Booking Website feature and explains which legacy names remain for compatibility.

## Current feature name

Use **Direct Booking Website** for:

- code comments and developer-facing copy
- Lambda and Amplify environment variables
- docs and design references
- service, repository, and helper names

## Environment variables

Prefer these names:

- `DIRECT_BOOKING_WEBSITE_FALLBACK_DOMAIN_SUFFIX`
- `DIRECT_BOOKING_WEBSITE_FALLBACK_ROUTING_ACTIVE`
- `DIRECT_BOOKING_WEBSITE_MONTHLY_FIXED_COST_EUR`
- `DIRECT_BOOKING_WEBSITE_MONTHLY_VARIABLE_COST_PER_SITE_EUR`
- `DIRECT_BOOKING_WEBSITE_USAGE_WINDOW_DAYS`
- `DIRECT_BOOKING_WEBSITE_COST_PER_BUILD_ATTEMPT_EUR`
- `DIRECT_BOOKING_WEBSITE_COST_PER_DRAFT_SAVE_EUR`
- `DIRECT_BOOKING_WEBSITE_COST_PER_LIVE_SYNC_EUR`
- `DIRECT_BOOKING_WEBSITE_COST_PER_PUBLIC_PREVIEW_OPEN_EUR`
- `DIRECT_BOOKING_WEBSITE_COST_PER_PUBLIC_SITE_OPEN_EUR`
- `REACT_APP_DIRECT_BOOKING_WEBSITE_FALLBACK_DOMAIN_SUFFIX`

The direct booking website runtime now expects only these `DIRECT_BOOKING_WEBSITE_*` and `REACT_APP_DIRECT_BOOKING_WEBSITE_*` names in active AWS configuration.

## Legacy compatibility names that remain intentionally

These storage names still use `standalone_*` and should be treated as legacy implementation details for now:

- Aurora tables such as `main.standalone_site`, `main.standalone_site_domain`, `main.standalone_site_draft`, and `main.standalone_site_event`
- historical migration filenames that already describe the deployed schema history

These names were kept to avoid risky schema and migration churn while the feature remains active.

## Practical rule

If a developer is naming a new feature-level concept, use **Direct Booking Website**. If the code is touching an already deployed database table or historical migration file, keep the legacy storage name unless a dedicated schema migration is planned.
