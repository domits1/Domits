# Direct Booking Website Handoff

> Naming note: this feature is now named **Direct Booking Website**. Legacy `standalone_*` schema and storage names still appear below where they refer to already deployed tables and payloads.

## Purpose

This document is the practical handoff entry point for the Direct Booking Website feature. It is intended for the next engineer who needs to understand what is already implemented, where the code lives, what is live today, which parts are still forward design, and where future work should start.

This file does not replace the deeper docs. It sits on top of them and points to the right source of truth depending on the task.

## Read this first

If you are picking up this feature for the first time, use this reading order:

1. This handoff document
2. [Direct Booking Website Frontend Status](./direct_booking_website_frontend_status.md)
3. [Direct Booking Website Design Pack](./direct_booking_website_design_pack.md)
4. [ADR - Direct Booking Website V1](./direct_booking_website_adr.md)
5. [Direct Booking Website Implementation Log](./direct_booking_website_implementation_log.md)

Use the implementation log only when you need historical reasoning or want to understand when a specific behavior was introduced.

## Current implementation at a glance

The current foundation is no longer only a research or setup shell. The feature already supports:

- host-side website builder flow
- persisted draft storage per host and property
- dedicated editor page with section-scoped overrides
- internal draft preview route
- separate published live-site lifecycle
- public resolve/render APIs
- fallback-domain based runtime
- public preview and published-site telemetry
- WhatsApp-based public host contact widget
- first-party analytics events
- KPI dashboard for usage, build, preview, live-site, and research-aligned metrics

The current architecture deliberately separates:

- working draft state
- published live-site state
- domain state
- analytics event state

That split is important. Future work should preserve it.

## Feature surfaces

The current Direct Booking Website implementation spans six practical surfaces:

- builder workspace
- saved websites workspace
- draft editor
- internal public preview
- published public runtime
- KPI dashboard

Each surface is implemented in the same feature folder, but they do not all use the same data source or lifecycle state. Keep those boundaries explicit when changing behavior.

## What is live today

### Host-side flows

The host dashboard currently exposes:

- `/hostdashboard/website`
  - website builder workspace
  - listing selection
  - template selection
  - draft creation
  - `My websites` overview
  - permanent deletion with deletion reasons
- `/hostdashboard/website/:propertyId`
  - full editor page for an existing website draft
  - section-scoped overrides
  - preview viewport switching for desktop, tablet, and mobile
  - save draft, publish, unpublish, update live site, and discard-to-published actions
- `/hostdashboard/website/kpis`
  - Direct Booking Website KPI dashboard

### Public and preview routes

The frontend currently contains:

- `/website-preview/:draftId`
  - internal draft preview route
  - uses the saved draft plus enriched property details
  - emits preview LCP telemetry
- `/website-live/:domain`
  - same-origin debug route for published sites
- `/website-live`
  - same-origin published runtime entry
- `/`
  - when the current hostname matches the fallback-domain suffix, the root path renders the published Direct Booking Website runtime instead of the standard homepage
  - published live site uses `standalone_site` plus published overrides, not the draft row

### Backend APIs currently used

The current website foundation routes inside `PropertyHandler` are:

- `POST /property/website/event`
- `POST /property/website/draft`
- `GET /property/website/drafts`
- `GET /property/website/draft`
- `DELETE /property/website/draft`
- `GET /property/website/site`
- `POST /property/website/site/publish`
- `POST /property/website/site/unpublish`
- `GET /property/website/public/resolve`
- `GET /property/website/public/render`
- `GET /property/website/preview`
- `GET /property/website/kpis`

## What is not implemented yet

The current foundation still does **not** include:

- public quote API as a fully delivered guest-facing booking step
- checkout
- payment
- booking creation
- booking confirmation
- custom domains
- multiple fully implemented production templates
- host-scoped KPI isolation in the current dashboard view

These are still later-phase concerns, even when parts of the design pack already describe them.

## Current template status

Templates visible in the chooser:

- Panorama Landing
- Trust Signals
- Experience Journey
- Amenities Spotlight
- Gallery Grid
- Editorial Split
- Booking Focus
- Contact Focus
- Local Guide

Real rendered templates:

- Panorama Landing
- Trust Signals
- Experience Journey

Currently builder-enabled:

- Panorama Landing

Currently visible but marked `Coming soon` in the builder:

- Trust Signals
- Experience Journey
- Amenities Spotlight
- Gallery Grid
- Editorial Split
- Booking Focus
- Contact Focus
- Local Guide

Current practical product state:

- Panorama Landing has the deepest editor coverage and is the safest template to build on
- the other implemented templates are real-rendered, but are not currently builder-enabled and do not all have the same depth of section editing as Panorama
- silhouette-only templates should be treated as future work, not production-complete website variants

## Current implementation inventory

### Builder workspace

The builder workspace currently covers:

- host-owned listing selection
- listing summary preview before build
- template chooser
- real preview build workflow
- draft creation and persistence
- `My websites` overview with compact preview cards
- permanent delete flow with reason capture

Important current product reality:

- only Panorama Landing is builder-enabled
- the rest of the visible templates are product placeholders for later iteration

### Draft editor

The editor currently covers:

- section-scoped sidebar editing instead of one flat form
- collapsible editor sections
- preview-to-editor targeting
- image picker dialog for hero, residence, and gallery slot selection
- icon picker support for configurable amenities and template-specific icon areas
- desktop, tablet, and mobile preview switching
- internal working draft save
- live-site publish and unpublish actions
- update-live-site action
- discard back to published draft snapshot

Panorama Landing currently has the deepest implementation coverage. That is the template future work should use as the reference path.

### Internal public preview

The internal preview route currently:

- loads a saved draft by `draftId`
- enriches property details before rendering
- uses the shared template rendering layer
- subscribes to preview refresh events so an already-open preview can update after editor changes
- records preview-side LCP telemetry

### Published public runtime

The published public runtime currently:

- resolves the site by domain or by debug-route site context
- loads published site state separately from the draft
- renders from published snapshot data plus published overrides
- supports same-origin debug rendering through `/website-live/:domain`
- supports hostname-based runtime rendering on the fallback domain
- subscribes to live-site update messages so an already-open live site can refresh after editor updates
- records live-site LCP telemetry

### Public host contact

The public website currently includes a WhatsApp-based host contact widget when the host has a usable WhatsApp integration. That widget:

- is driven by shared host contact enrichment
- can be shown or hidden through visibility controls
- is best-effort presentation only and not a public chat platform

### Availability surface

The current website availability experience is read-only. It currently supports:

- imported external blocked dates
- accepted booking date keys
- PMS unavailable override dates
- iCal-related sync context where available
- month-to-month navigation inside the website availability surface

It does **not** yet support direct booking checkout or a finished quote/booking flow.

## KPI dashboard and implemented KPIs

The KPI dashboard lives at:

- `/hostdashboard/website/kpis`

Current implementation note:

- the dashboard is currently platform-wide across Domits, not host-scoped

### Dashboard tabs

The page currently contains these tabs:

- `Overview`
- `Performance`
- `Research`
- `Deletion reasons`

### Overview tab

The overview tab is currently grouped into these sections:

- `Usage in practice`
  - Website drafts created
  - Active website drafts
  - Draft saves
- `Builder and preview funnel`
  - Build attempts started
  - Successful website builds
  - Time to first preview p95
  - Build success rate
  - Build failure rate
  - Build abandonment rate
- `Live-site activity`
  - Unique live sites opened
  - Live site opens
  - Live site updates
  - Deleted websites

### Performance tab

The performance tab currently exposes:

- `site_lcp_p75`
  - mobile
  - tablet
  - desktop

Important implementation detail:

- this combines earlier preview-route telemetry and current live-site telemetry into one viewport-specific history

### Research tab

The research tab currently includes these KPI entries:

- `time_to_publish_p95`
- `cost_per_active_site_per_month`
- `fallback_subdomain_availability`
- `booking_api_error_rate`
- `quote_to_charge_mismatch_rate`
- `booking_funnel_completion_rate`
- `custom_domain_setup_success_rate`

Current implementation status of those entries:

- fully or practically instrumented:
  - `time_to_publish_p95`
  - `cost_per_active_site_per_month`
  - `fallback_subdomain_availability`
- proxy metric:
  - `quote_to_charge_mismatch_rate`
- not fully instrumented yet:
  - `booking_api_error_rate`
  - `booking_funnel_completion_rate`
  - `custom_domain_setup_success_rate`

Important implementation notes:

- `fallback_subdomain_availability` is a configuration/runtime-state availability metric, not synthetic uptime
- `quote_to_charge_mismatch_rate` is currently a proxy based on published room-rate snapshot versus current PMS base room rate, not a full quote-to-payment correctness chain

### Deletion reasons tab

The deletion reasons tab shows the current breakdown of website draft removals using the configured delete-reason list plus any additional persisted reasons already present in event storage.

## Analytics and event tracking

Current analytics and event coverage includes:

- `WEBSITE_BUILD_FLOW_STARTED`
- `WEBSITE_BUILD_STARTED`
- `WEBSITE_PREVIEW_READY`
- `WEBSITE_BUILD_SUCCEEDED`
- `WEBSITE_BUILD_FAILED`
- `WEBSITE_BUILD_FLOW_ABANDONED`
- `SITE_LCP_RECORDED`
- `LIVE_SITE_UPDATED`
- `PUBLIC_PREVIEW_OPENED`
- `PUBLIC_SITE_OPENED`

Important event split:

- host-side builder and editor events go through authenticated host event recording
- public preview and live-site telemetry is best-effort and uses the public event path without assuming host auth

## Source-of-truth file map

### Frontend feature root

Main frontend feature folder:

- `frontend/web/src/features/hostdashboard/website`

Start here for the main surfaces:

- `WebsiteBuilderPage.js`
- `WebsiteEditorPage.js`
- `WebsitePublicPreviewPage.jsx`
- `WebsitePublicSitePage.jsx`
- `websiteTemplates.js`

Shared render and model layer:

- `rendering/buildWebsiteTemplateModel.js`
- `rendering/templateRegistry.js`
- `rendering/WebsiteTemplatePreview.jsx`
- `rendering/WebsiteTemplatePreview.module.scss`
- `rendering/templates/PanoramaLandingTemplate.jsx`
- `rendering/templates/TrustSignalsTemplate.jsx`
- `rendering/templates/ExperienceJourneyTemplate.jsx`
- `rendering/templates/templateSharedSections.jsx`
- `rendering/websiteDraftContentOverrides.js`
- `rendering/websiteDraftThemeOverrides.js`
- `rendering/websiteImageSlotUtils.js`

Editor-specific structure:

- `editor/WebsiteEditorSidebar.jsx`
- `editor/WebsiteEditorPageSupport.jsx`
- `editor/hooks/useWebsiteEditorTargeting.js`
- `editor/sections/*`
- `editor/fields/*`
- `websiteEditorConfig.js`

Frontend service layer:

- `services/websiteDraftService.js`
- `services/websiteSiteService.js`
- `services/websitePublicPreviewService.js`
- `services/websitePublicSiteService.js`
- `services/websitePreviewWorkflow.js`
- `services/websitePropertyService.js`
- `services/websiteContactService.js`
- `services/websiteHostMessagingService.js`
- `services/websitePreviewSync.js`

Analytics and KPI frontend:

- `analytics/*`
- `kpis/WebsiteKpiDashboardPage.js`
- `kpis/websiteKpiConfig.js`
- `kpis/websiteKpiFields.js`
- `kpis/services/websiteKpiService.js`

### Backend feature root

Current backend ownership is centered in:

- `backend/functions/PropertyHandler`

Main entry points:

- `index.js`
- `controller/propertyController.js`

Website-specific repositories:

- `data/repository/directBookingWebsiteDraftRepository.js`
- `data/repository/directBookingWebsiteSiteRepository.js`
- `data/repository/directBookingWebsiteDomainRepository.js`
- `data/repository/directBookingWebsiteEventRepository.js`

Routing and env helper:

- `util/directBookingWebsiteRouting.js`

## Data ownership and persistence

The current storage split is the key foundation decision:

- `main.standalone_site_draft`
  - working draft state used by the builder and editor
- `main.standalone_site`
  - published live-site snapshot and lifecycle state
- `main.standalone_site_domain`
  - fallback-domain and later custom-domain state
- `main.standalone_site_event`
  - analytics and KPI event storage

Important rules:

- `Save changes` updates the draft
- `Update live site` pushes the current draft into published live state
- `Publish` creates or updates the published standalone site lifecycle
- `Unpublish` affects live availability, not the host's working draft
- `main.standalone_site_event` owns the KPI and event layer for builder, preview, live-site, and research metrics

Do not collapse draft state and published state back into one model.

## Environment and runtime assumptions

Current Direct Booking Website config depends on these active env names:

Backend:

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

Frontend:

- `REACT_APP_DIRECT_BOOKING_WEBSITE_FALLBACK_DOMAIN_SUFFIX`

If the public site works but KPI fallback-domain readiness looks wrong, check the backend Lambda env first. The frontend suffix alone is not enough for backend KPI interpretation.

## What to use each document for

Use these docs for these questions:

- **What is implemented right now?**
  - [Direct Booking Website Frontend Status](./direct_booking_website_frontend_status.md)
- **Why is the architecture shaped this way?**
  - [ADR - Direct Booking Website V1](./direct_booking_website_adr.md)
- **What is the intended v1/v2 design and data ownership?**
  - [Direct Booking Website Design Pack](./direct_booking_website_design_pack.md)
- **What changed over time?**
  - [Direct Booking Website Implementation Log](./direct_booking_website_implementation_log.md)
- **What names, envs, and legacy terms are still valid?**
  - [Direct Booking Website Naming](./direct_booking_website_naming.md)
- **What belongs to the research document rather than implementation handoff?**
  - [Direct Booking Website Plan Of Approach](./direct_booking_website_plan_of_approach.md)

## Practical handoff guidance

When continuing this feature, prefer this workflow:

1. Confirm whether the task is:
   - builder and editor UX
   - template rendering
   - public runtime
   - backend persistence or API
   - analytics or KPI
2. Read this document and the frontend status doc first.
3. Inspect the relevant frontend service or backend repository before changing UI behavior.
4. Check whether the behavior belongs to:
   - draft state
   - published site state
   - domain state
   - event or KPI state
5. If the task changes ownership boundaries, also check the ADR and design pack before implementing.

## Best next areas for future work

The most likely next engineering tracks are:

- make KPI dashboard host-scoped instead of platform-wide
- harden fallback-domain and public-runtime rollout beyond debug-route usage
- deepen template parity beyond Panorama Landing
- introduce authoritative quote APIs
- later add checkout and booking creation
- add custom-domain activation lifecycle

## Roadmap and likely next steps

The most realistic next-step roadmap for this feature is:

- **Custom domains**
  - complete the custom-domain verification and activation lifecycle on top of the existing domain model
  - keep fallback-domain continuity when custom domain setup fails
- **Multi-listing compatibility**
  - the current v1 model is one Direct Booking Website per PMS property
  - a later expansion could support multi-listing or multi-property websites, but that would require new ownership, navigation, and snapshot decisions rather than a small UI change
- **Host-scoped KPI dashboard**
  - the current KPI page is still platform-wide
  - moving to host-scoped analytics is one of the highest-value next operational improvements
- **Template expansion**
  - finish builder-enabled support beyond Panorama Landing
  - deepen editor parity so other templates are not only renderable but also safely editable
- **Authoritative quote flow**
  - add real server-side quote APIs as the first direct-booking extension beyond the current read-only availability foundation
- **Checkout and booking lifecycle**
  - after quote APIs, add checkout, booking creation, confirmation, and the required event instrumentation
- **Custom-domain and public-runtime hardening**
  - improve rollout confidence, failure handling, and smoke-test guidance for live domain routing
- **Broader product expansion**
  - later phases can explore multilingual support, more advanced SEO handling, and possibly multi-property presentation, but those are not small v1 follow-ups

## Known traps

- Do not assume draft preview and live site are the same data source.
- Do not trust the browser host header for public API tenant resolution without checking the current explicit domain flow.
- Do not treat the research-oriented design sections as proof that a flow is already implemented.
- Do not assume all templates have equal editor coverage.
- Do not assume all real-rendered templates are currently builder-enabled.
- Do not treat KPI labels as proof that every research KPI is fully instrumented; some are still proxy or not-yet-instrumented states.
- Do not forget that the KPI page is currently platform-wide, so host-specific product decisions should not be made from it without further filtering.

## Related docs

- [Direct Booking Website Frontend Status](./direct_booking_website_frontend_status.md)
- [Direct Booking Website Design Pack](./direct_booking_website_design_pack.md)
- [ADR - Direct Booking Website V1](./direct_booking_website_adr.md)
- [Direct Booking Website Implementation Log](./direct_booking_website_implementation_log.md)
- [Direct Booking Website Naming](./direct_booking_website_naming.md)
- [Direct Booking Website Plan Of Approach](./direct_booking_website_plan_of_approach.md)
