---
type: project
status: active
project: direct-booking-website
area: feature-context
owner: engineering
created: 2026-05-28
updated: 2026-06-25
confidence: high
source:
  - repo: docs/internal/apis/directbookingwebsite/direct_booking_website_handoff.md
  - repo: docs/internal/apis/directbookingwebsite/direct_booking_website_design_pack.md
  - repo: docs/internal/apis/directbookingwebsite/direct_booking_website_adr.md
  - repo: docs/internal/apis/directbookingwebsite/direct_booking_website_plan_of_approach.md
  - repo: docs/internal/apis/directbookingwebsite/direct_booking_website_frontend_status.md
  - repo: docs/internal/apis/directbookingwebsite/direct_booking_website_naming.md
  - repo: docs/internal/apis/calendar/host_guest_calendar_workflow.md
  - repo: docs/internal/apis/propertyhandler/property_handler.md
  - repo: docs/internal/apis/bookingengine/booking_and_reservation.md
related:
  - [[Direct_Booking_Website_Current_Task]]
  - [[Domits_Core_Modules]]
  - [[Direct_Booking_Website_Repo_Sources]]
---
# Direct Booking Website

- Last synced: 2026-06-25
- Scope: durable feature contract for the host-owned public website channel in Domits.

## Feature Purpose

- The Direct Booking Website feature lets a host publish one template-based public website per property.
- It is an owned acquisition and conversion surface built on top of PMS data, not a separate operational source of truth.

## Product Naming And Interim Builder Split

- The host-facing product term should now be `Website Builder`.
- Existing internal file names, backend table names, and older docs still use `direct booking website` or `standalone site` language. Treat those as legacy/internal naming, not as the preferred product label.
- There are currently two builder paths:
  - a listing-based Website Builder path that imports Domits property data and persists through the current property-bound backend contract
  - a from-scratch Website Builder path that stores a temporary draft in browser local storage and does not rely on Domits property data yet
- The from-scratch Website Builder is intentionally temporary until Supabase-backed persistence exists.
- The from-scratch Website Builder must not imply that a real published domain, custom domain, or durable backend website record already exists.

## V1 Foundation

- one website per property
- shared multi-tenant frontend runtime inside the existing Domits React stack
- host draft editor plus internal draft preview
- separate published live-site lifecycle
- fallback Domits subdomain
- first-party website analytics and KPI collection
- published descriptive content snapshot imported from PMS
- read-only availability snapshot imported from PMS/calendar flows
- no public checkout, booking creation, or confirmation yet

## From-Scratch Website Builder Bridge

- The temporary from-scratch Website Builder currently captures:
  - title and headline copy
  - description and supporting CTA copy
  - direct image URLs for hero, residence, and gallery slots
  - amenities/highlights
  - host/contact framing
  - basic theme color
- The current implementation stores those drafts in browser local storage only.
- The preview uses the shared fallback website model so template rendering can stay close to the main Website Builder contracts even without PMS data.
- This path is deliberately separate from the current backend draft/site lifecycle because the persisted backend flows still require `propertyId`.
- When Supabase is ready, this temporary local-draft layer should be replaced with a real data model and durable storage path instead of expanding the browser-local stopgap indefinitely.

## Durable Architecture

- Draft state is intentionally separate from published site state.
- The implemented storage model uses:
  - `main.standalone_site_draft`
  - `main.standalone_site`
  - `main.standalone_site_domain`
  - `main.standalone_site_event`
- Public render resolves and serves standalone-owned published snapshots instead of doing live descriptive PMS reads on every request.
- PMS remains upstream for descriptive property data, availability truth, pricing truth, and eventual booking creation.
- The editor, internal preview, and live site share one website model and one skeleton-loading pattern.

## Public Preview And Live Loading Strategy

- Public preview and published live site now load in two phases instead of blocking first render on all detail enrichment.
- Phase 1 is the critical render path:
  - fetch the base website render payload
  - build the shared website template model from the returned property snapshot, template key, content overrides, and theme overrides
  - render the page immediately from that snapshot
- Phase 2 is deferred enrichment:
  - enrich property details with host profile and WhatsApp details
  - enrich availability details with iCal sync sources, PMS blocked or booked dates, and calendar overrides
  - patch the render payload after first paint so lower-priority sections can become more complete without delaying the hero
- Published live-site loading should prefer the render endpoint directly when a domain is known. Do not add a separate resolve call in front of rendering unless the resolution result is needed independently from the page render.
- This loading split is valid because the website model already tolerates partial property details. Hero copy, title, image, theme, and core descriptive snapshot can render without waiting for contact or availability enrichment.

## Published Domain Reachability

- The canonical Domits fallback live hostname is backend-generated and ends with `.direct.domits.com`.
- The current naming rule is `<slugified-site-name>-<first-8-alphanumeric-chars-of-site-id>.direct.domits.com`.
- The host dashboard decides whether to open the absolute Domits fallback domain or the internal `/website-live/...` route from backend site-summary data, not from frontend-only assumptions.
- The frontend only opens the absolute live domain when the backend summary returns the primary domain as reachable and active.
- A published site can drift into an inconsistent state where:
  - `site.status = PUBLISHED`
  - the fallback domain row remains stale or disabled
  - the dashboard still opens the internal `/website-live/...` route
  - the public `*.direct.domits.com` render endpoint returns `404`
- Runtime reachability for fallback domains must therefore not rely only on stale stored row state. When fallback routing is globally active, published fallback domains may need runtime healing so the public render path and host dashboard summary treat them as active again.
- A previously unpublished site can leave its fallback domain row in a disabled state. Republish must not leave the site in a split state where the site is published but the live domain is still treated as disabled at runtime.

## Acceptance Debug Flow

- When a published live domain does not open, inspect `GET /property/website/site?property=<propertyId>` first.
- The fastest truth signals are:
  - `site.status`
  - `primaryDomain.domain`
  - `primaryDomain.status`
  - `isReachable`
- If the host dashboard still opens `acceptance.domits.com/website-live/...`, the backend summary is still telling the frontend that the live domain is not active yet.
- If `GET /property/website/public/render?domain=<fallback-domain>` returns `404`, the backend still considers that public hostname unresolved or unreachable even if the site itself is published.
- For acceptance fallback-domain incidents, compare the site summary response and the public render response before blaming frontend routing or preview logic.
- Public-surface auth initialization errors like `GetUserInfo` / `No current user` are noise on anonymous direct-booking surfaces unless they block the actual website render request.

## LCP And Hero Rules

- On Panorama Landing, the hero image is the most likely Largest Contentful Paint candidate, though the hero headline can also win depending on viewport and timing.
- The hero section must stay on the critical path:
  - do not hide it behind scroll-reveal or first-load animation
  - mark the runtime hero image as eager and high priority
  - keep non-hero runtime images lazy and lower priority so they do not compete with the hero
- Above-the-fold rendering should not wait on calendar sync metadata, blocked-date enrichment, or host messaging enrichment.
- If a future change adds new above-the-fold data requirements, explicitly decide whether that data belongs in Phase 1 or Phase 2 instead of letting it silently drift into the critical path.
- Public runtime hero delivery now uses responsive image variant selection where variant metadata exists:
  - the website model keeps `thumb`, `web`, and `original` hero sources instead of collapsing immediately to one URL
  - the public runtime emits hero `srcSet` for the non-editor render path so mobile can prefer the smaller variant and larger screens can still pick the larger asset
  - editor preview does not use the public responsive hint path, because its embedded canvas width would otherwise encourage overfetch relative to the real public viewport
- Panorama public runtime also now protects first paint by moving non-critical below-the-fold work later:
  - the gallery overlay is lazy-loaded only when a visitor opens it, so it does not sit in the initial website bundle
  - the availability calendar preview is behind a lazy boundary instead of being part of the first render bundle by default
  - lower public sections now use deferred rendering via `content-visibility: auto` so layout and paint focus stays on the hero path first
  - editor preview keeps full immediate interactivity and does not opt into the below-the-fold deferred-section path

## Performance Implications

- A slower public render is not always an image-only problem. In this feature, request chaining and non-critical enrichment can delay LCP before the hero even starts painting.
- The current preferred sequence is:
  - render snapshot first
  - hydrate secondary data after
  - prioritize the hero asset
  - avoid first-paint animation on the LCP candidate
  - prefer responsive hero variant selection on public runtime surfaces
  - keep modal/gallery JS and lower-section render work out of the initial public path when visitors have not asked for it yet
- Remaining image-performance work should focus on reducing bytes and paint cost further, not on reintroducing slower render-path chaining.
- A manual republish should not be the default fix for performance behavior. The runtime should derive as much as possible from stored variant keys and safe fallback widths. Republish only remains useful for very old published snapshots that predate usable variant-key data.

## Preview And Runtime Parity Lessons

- Panorama hero rotation exposed that the hero slot was structurally different from the other image slots. The hero also needs a stable frame wrapper when rotation is enabled, otherwise the preview height can shift even when other image slots remain stable.
- Editor preview parity is not controlled only by normal browser breakpoints. The editor also uses simulated viewport classes, so responsive Panorama changes must be checked in both:
  - real public breakpoints
  - editor preview viewport utility classes
- If preview, public preview, and live site diverge, treat that as a shared rendering contract problem instead of solving only one surface in isolation.

## Panorama Editor Information Architecture

- Panorama should expose its editor sections in website order from top to bottom instead of keeping first-screen controls in a generic shared-content bucket.
- The first Panorama editor section is `Hero`.
- The `Hero` section owns the controls for the top public block:
  - hero image slot
  - hero content position
  - website title
  - hero eyebrow
  - hero title
  - CTA label
  - CTA note
  - booking prompt visibility toggle
- Panorama hero content position uses a 3x3 alignment model so hosts can place the hero copy block across top, middle, or bottom and left, center, or right.
- The booking prompt visibility toggle belongs inside the `Hero` section as the last control in that group, not in the generic `Section visibility` section.
- Panorama quick-scan cards sit immediately after `Hero` in the editor because they render directly below the hero on the website.
- The `Residence` section follows the quick-scan cards section.

## Current Implementation Baseline

- Real rendered templates currently include Panorama Landing, Trust Signals, and Experience Journey.
- The editor/runtime already covers section visibility, image-slot selection, shared availability cards, and WhatsApp contact affordances.
- The host workflow now distinguishes between saving draft changes and updating the live site.
- The repo now also has a practical handoff doc that sits above the design pack/status docs when a new engineer picks up this feature.

## Important Constraints

- English is the only primary site language in v1.
- Custom domains are designed but not yet implemented.
- Public availability shown on the site is still a snapshot, not an authoritative public quote API.
- Template parity is incomplete; Panorama currently has the deepest polish.
- The current published-preview path still belongs to the listing-based/property-bound Website Builder flow. The temporary from-scratch Website Builder does not publish yet.

## Read Next

- Use [[Direct_Booking_Website_Current_Task]] for live implementation scope.
- Use [[Direct_Booking_Website_Repo_Sources]] for the repo docs that define design, status, decisions, and naming.
