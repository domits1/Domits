---
type: project
status: active
project: direct-booking-website
area: active-work
owner: engineering
created: 2026-05-28
updated: 2026-06-25
confidence: high
related:
  - [[Active_Feature_Tasks]]
  - [[Direct_Booking_Website]]
---
# Direct Booking Website Current Task

- Updated: 2026-06-25T00:00:00+02:00 (W. Europe Standard Time)
- Branch: feat/direct-booking-website-templates
- Status: active

## Start Here
1. [[Active_Feature_Tasks]] for the active-work branch.
2. [[Direct_Booking_Website]] for the durable feature contract and repo doc index.

## Objective
Keep refining the Website Builder editor/runtime and public website surfaces with emphasis on Panorama polish, accurate preview/live parity, KPI clarity, documentation handoff quality, reusable shared contracts, and a temporary from-scratch builder path that does not depend on Domits property data.

## Latest Step
Added a separate Website Builder from-scratch path that captures temporary website inputs in browser local storage instead of relying on Domits PMS/property data. The new builder path uses the shared fallback preview model, lets a host enter title, descriptive copy, image URLs, amenities, contact messaging, and theme color manually, and explicitly avoids implying that a real published domain or durable backend draft exists yet. The existing listing-based builder and published preview path remain intact, but the underlying persisted draft/site lifecycle is still property-bound through `propertyId`.

## Current Focus
Keep the Website Builder docs/vault aligned with the shipped implementation and continue template/runtime polish without regressing:
- shared preview/live rendering contracts
- public-site shell behavior
- progressive loading and LCP-sensitive rendering
- mobile responsiveness
- KPI dashboard accuracy
- maintainable reusable styling patterns
- published fallback-domain reachability parity between dashboard summary and public render
- the temporary from-scratch website builder flow with local-only draft storage until Supabase exists

## Changed Files
- docs/internal/apis/directbookingwebsite/direct_booking_website_handoff.md
- docs/internal/apis/directbookingwebsite/bookingengine.md
- docs/internal/context/domits_vault/01_Foundation/Clean_Code_Standards.md
- docs/internal/context/domits_vault/02_Codex_Context/Direct_Booking_Website_Current_Task.md
- docs/internal/context/domits_vault/03_Capabilities/Direct_Booking_Website.md
- frontend/web/src/features/hostdashboard/mainDashboardHost.js
- frontend/web/src/features/hostdashboard/website/WebsiteBuilderPage.js
- frontend/web/src/features/hostdashboard/website/WebsiteBuilderStudioPage.js
- frontend/web/src/features/hostdashboard/website/editor/WebsiteEditorPageSupport.jsx
- frontend/web/src/features/hostdashboard/website/editor/WebsiteEditorStates.jsx
- frontend/web/src/features/hostdashboard/website/rendering/buildWebsiteDraftFallbackModel.js
- frontend/web/src/features/hostdashboard/website/services/websiteBuilderLocalDraftService.js
- frontend/web/src/features/hostdashboard/website/kpis/websiteKpiConfig.js
- frontend/web/src/features/hostdashboard/website/kpis/WebsiteKpiDashboardPage.js
- frontend/web/src/features/hostdashboard/website/WebsitePublicPreviewPage.jsx
- frontend/web/src/features/hostdashboard/website/WebsitePublicSitePage.jsx
- frontend/web/src/features/hostdashboard/website/rendering/WebsiteTemplatePreview.jsx
- frontend/web/src/features/hostdashboard/website/rendering/WebsiteTemplatePreview.module.scss
- frontend/web/src/features/hostdashboard/website/rendering/templates/PanoramaLandingTemplate.jsx
- frontend/web/src/features/hostdashboard/website/rendering/templates/templateSharedSections.jsx
- frontend/web/src/features/hostdashboard/website/WebsitePublicPreviewPage.module.scss
- frontend/web/src/features/hostdashboard/website/WebsiteEditorPage.module.scss
- frontend/web/src/styles/sass/app.scss

## Decisions
- Public website, internal preview, and editor preview should stay visually and behaviorally aligned; if one surface diverges, treat that as a real implementation problem.
- Panorama mobile behavior should be solved through shared responsive contracts where possible, not by stacking isolated one-off fixes for each screen size.
- Prefer dynamic responsive sizing over hardcoded magic numbers when UI elements should scale across device widths.
- Direct Booking Website documentation should be explicit enough that another developer can continue the feature without relying on chat history.
- The host-facing product term should now be `Website Builder` even though older docs, route contracts, and storage tables still use `direct booking website` or `standalone site` language internally.
- Public preview and live site should render from the base snapshot before non-critical enrichment completes.
- Host profile, WhatsApp, calendar sync details, blocked dates, and overrides are secondary enrichment data unless they are explicitly required above the fold.
- The Panorama hero should be treated as an LCP-critical element: no first-load reveal animation, eager/high-priority image loading, and lower priority for non-hero runtime images.
- Public responsive image hints should stay dynamic and data-driven from available image variants instead of introducing hardcoded one-off viewport image swaps in the template.
- Public runtime performance improvements should prefer code-splitting and deferred below-the-fold rendering before asking hosts to republish live sites.
- Dashboard live-link behavior is backend-driven. If the site summary says the primary domain is not active, the frontend will intentionally fall back to the internal `/website-live/...` route.
- Direct-booking public-surface `GetUserInfo` / `No current user` errors are currently secondary noise unless they block the website render request itself.
- The from-scratch Website Builder path is intentionally local-only for now. It should save browser-local drafts first, avoid fake publish/domain promises, and later swap its persistence layer to Supabase instead of trying to force-fit itself into the current property-bound backend contract.

## Risks / Follow-up
- Panorama still has the deepest polish; template parity across Trust Signals and Experience Journey remains follow-up work.
- Public checkout, quote, and booking completion are still out of scope for the live site.
- Mobile/public shell regressions can come from shared app-level layout styles, not only from website template code, so root-level spacing and header rules should be checked before debugging the template itself.
- Acceptance debugging should start with the backend site summary and public render responses before spending time on template-only fixes.
- Future work areas still include custom domains, multi-listing compatibility, deeper KPI instrumentation, and quote/checkout lifecycle work.
- Older published snapshots may not yet contain full image variant width metadata until they are republished, so runtime responsive hero selection must keep safe fallbacks for partial image records.
- A broad automatic republish of live sites is not the safe default because republish changes guest-facing published content. If old sites ever need metadata enrichment at scale, prefer a targeted snapshot backfill over an invisible republish.
- A true propertyless saved Website Builder still does not exist in backend storage yet because draft/site controller flows remain tied to `propertyId`. The current local builder is a temporary bridge, not the final architecture.
