# Standalone Property Site Custom Domain

## Purpose
This document describes the current custom-domain lifecycle for Domits direct booking websites. It is the implementation-facing reference for how a host requests, rechecks, activates, and deactivates a custom domain on top of the existing live-site foundation.

Related docs:
- [Frontend status](./standalone_property_site_frontend_status.md)
- [Design pack](./standalone_property_site_design_pack.md)
- [ADR](./standalone_property_site_adr.md)

## Current implementation status
Custom domains are no longer only future design. The current implementation now includes:

- host-side custom-domain request flow from the dedicated website editor
- separate `CUSTOM` domain rows in `main.standalone_site_domain`
- request persistence as `PENDING`
- manual recheck flow that promotes a pending domain to `VERIFIED`
- activation flow that promotes a verified domain to `ACTIVE`
- deactivation flow that returns the custom domain to `VERIFIED`
- fallback-domain continuity while custom domain setup is pending
- primary-domain switching so `Open live site` prefers the active custom primary host

What is still not finished:

- provider-backed verification against Amplify / CloudFront / ACM
- automated DNS-instruction generation from live platform config
- automated certificate issuance checks
- automatic domain onboarding into the real hosting layer

Current lifecycle state is therefore functional at the application level, but still partially manual at the infrastructure-verification layer.

## Data model
Custom domains use the existing domain table:

- `main.standalone_site_domain`

Relevant fields:

- `domain_type`
  - `FALLBACK`
  - `CUSTOM`
- `status`
  - `PENDING`
  - `VERIFIED`
  - `ACTIVE`
  - `FAILED`
  - `DISABLED`
- `is_primary`
- `verification_details_json`

The current rule is:

- fallback domain stays available as the safe Domits live link
- custom domain can become the public primary host only after activation
- public render remains domain-first, never property-id-first

## Host flow
The current host flow is:

1. Publish the live site so the fallback domain exists.
2. Open the website action menu in the editor.
3. Choose `Set up custom domain` or `Review custom domain setup`.
4. Enter a hostname such as `stay.example.com`.
5. Save the request.
6. Recheck setup when domain-side and platform-side preparation are ready.
7. Activate the custom domain.
8. Deactivate it later if Domits should fall back to the Domits live link again.

Current validation rules:

- subdomain only, e.g. `stay.example.com`
- root/apex domains such as `example.com` are rejected in this phase
- Domits-managed suffixes such as `*.direct.domits.com` are rejected
- the requested custom domain must differ from the fallback live link

## State transitions
Current supported transitions:

- request
  - no custom domain -> `PENDING`
- recheck
  - `PENDING` -> `VERIFIED`
  - `FAILED` -> `VERIFIED`
- activate
  - `VERIFIED` -> `ACTIVE`
- deactivate
  - `ACTIVE` -> `VERIFIED`

Primary-host behavior:

- when custom domain is `ACTIVE`, it becomes `is_primary = true`
- fallback domain remains stored and can stay active as a secondary fallback
- when custom domain is deactivated, fallback regains `is_primary = true`

## Current API surface
Host-managed routes:

- `POST /property/website/site/domain/custom`
  - request or update the custom-domain request
- `POST /property/website/site/domain/custom/recheck`
  - manual recheck / mark ready
- `POST /property/website/site/domain/custom/activate`
  - activate the verified custom domain
- `POST /property/website/site/domain/custom/deactivate`
  - deactivate the active custom domain and return fallback to primary

These routes currently live in `PropertyHandler` and are backed by:

- `backend/functions/PropertyHandler/business/service/standaloneSiteCustomDomainService.js`
- `backend/functions/PropertyHandler/data/repository/standaloneSiteDomainRepository.js`
- `backend/functions/PropertyHandler/controller/propertyController.js`

## Frontend structure
Frontend custom-domain code is intentionally isolated under the website feature:

- `frontend/web/src/features/hostdashboard/website/custom-domain/`
  - `WebsiteCustomDomainDialog.jsx`
  - `websiteCustomDomainModel.js`
  - `websiteCustomDomainSetupContent.js`
- `frontend/web/src/features/hostdashboard/website/services/websiteCustomDomainService.js`

This keeps custom-domain behavior inside the direct-booking website feature without turning `WebsiteEditorPage.js` into the sole owner of domain logic.

## Open live site behavior
`Open live site` now follows the current primary domain in the site summary:

- active custom primary domain -> open `https://custom-host`
- otherwise -> open the Domits live link
- otherwise -> fall back to the same-origin debug route when the primary domain is not publicly active

This means hosts do not need a second “open custom domain” button once activation exists.

## AWS / hosting work still required
Application-level state is now in place, but a real public custom domain still needs hosting alignment.

Required infrastructure work:

1. Frontend hosting environment must support the requested custom hostnames.
2. Amplify / CloudFront must accept those hostnames.
3. ACM certificates must cover those hostnames.
4. Route 53 or external DNS records must point the hostnames to the correct frontend distribution.
5. Verification should later move from manual recheck to provider-backed validation.

Current intent is:

- fallback live link remains the safe rollout path
- custom domain lifecycle can be exercised now at the product/data-model layer
- provider automation can be layered on top without redesigning the current site/domain model

## Current limitations
- verification is currently manual application-state progression, not provider-backed proof
- exact DNS instructions are not generated yet from live Amplify/ACM state
- apex/root custom domains are intentionally out of scope for the current phase
- API Gateway still needs the new custom-domain routes deployed in acceptance/live environments before the flow works outside local code
