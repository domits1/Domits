# Direct Booking Website Frontend Status

> Naming note: this feature is now named **Direct Booking Website**. Legacy `standalone_*` schema names are preserved in this document only when they refer to deployed storage objects.

## Purpose

This document tracks the current implementation status of the host-side direct booking website builder and published-site runtime in the frontend. It captures what is implemented now, what remains internal-preview-only, and what the next phase must cover.

Historical iteration log:

- `docs/internal/apis/directbookingwebsite/direct_booking_website_implementation_log.md`

## Current status

The feature is no longer only a setup shell. It now covers three connected surfaces:

- in-dashboard builder preview for first-pass setup
- persisted draft editing for host-owned websites
- a separate published live-site lifecycle backed by `standalone_site` and `standalone_site_domain`

What is in place:

- A dedicated website builder page with a step-based flow.
- Listing selection via host-owned listing options.
- Listings that already have a saved website draft are excluded from the builder dropdown until that website is deleted.
- Template chooser with silhouette previews.
- Real preview build flow for implemented templates.
- Data mapping from selected listing detail payload into a shared template model.
- Draft persistence to backend storage per host and property.
- Saved website draft overview tab (`My websites`) with dedicated editor-page entry.
- Dedicated draft editor page with section-scoped override editing for:
  - website title and hero copy
  - residence title, headline, description, and panel settings
  - calendar title, description, and panel settings
  - contact footer copy, avatar mode, and colors
  - amenities order, labels, icons, and icon color
  - trust-card and journey-stop copy for implemented templates
- Template-aware section visibility toggles for implemented templates.
- The editor now uses dedicated dropdown sections for shared website areas such as residence, calendar, amenities, contact, and image slots instead of keeping all controls in one flat list.
- Image-slot selection for hero/gallery slots used by implemented templates, now driven through a visual image-picker overlay instead of dropdown-only controls.
- Image slots can now opt into shared rotation through imported listing photos, with the selected slot image acting as the lead image in the rotating sequence.
- Editor save feedback now uses toast notifications instead of inline status copy inside the form.
- Image-slot picker now uses a compact thumbnail grid that can scale to larger imported photo sets without a large hero preview stage.
- Scaled preview rendering with dedicated desktop/tablet/mobile viewport switching in the editor.
- Compact scaled website preview cards inside `My websites`, with corrected thumbnail scaling, clipped preview height, and reduced card whitespace.
- Saved website cards display the persisted website title override when the host changes the title in the editor.
- Saved website cards now expose both `Open editor` and `Delete permanently`, so deleting a website immediately makes its listing available again in the builder.
- The saved website delete action is visually destructive/red and now opens an in-app confirmation overlay before deletion.
- The saved website delete overlay now forwards selected deletion reasons to backend website event tracking and can be closed by clicking outside the dialog.
- Compact saved website previews use thumbnail image variants where the property image payload provides them, reducing unnecessary image weight in `My websites`.
- Compact saved website previews are centered on mobile cards.
- Editor sections are now collapsible so the left-side control surface remains usable as more override fields are added.
- Clicking editable areas in the editor preview now opens or scrolls to the matching editor section, and clicking preview images opens the image picker directly.
- Clicking editable areas now still lands correctly even when the destination dropdown is collapsed first, because preview-to-editor targeting performs a second pass after the section opens.
- The editor targeting/runtime logic is now split into dedicated modules (`editor/fields`, `editor/sections`, `editor/hooks`, dedicated picker dialogs, and feature-shared `config` files) instead of keeping all interaction code inside `WebsiteEditorPage.js`.
- Preview-to-editor jumps now briefly highlight the matched editor section so users can see where they landed after clicking the preview.
- Editor loading now keeps the editor shell visible and uses section-level pulse-bar loaders instead of a single blocking state card.
- Editor section bodies now open and close with an animated dropdown transition instead of a hard mount/unmount jump.
- Implemented previews now include a reusable visitor contact widget that can be shown or hidden through the editor visibility controls.
- The visitor contact widget uses the shared unified messaging send service with host/property context so it can flow toward Domits messages once the public-site contact endpoint contract is finalized.
- Imported calendar availability now flows into website previews from `hostDashboard/single`, including:
  - imported external blocked dates
  - iCal sync presence
  - sync-source count
  - last sync timestamp when available
- The website-side calendar payload is now enriched with the same iCal source/block data used by the host calendar sync flow, which keeps the website calendar snapshot closer to the PMS/calendar tab.
- The website-side calendar payload now also merges PMS unavailable date overrides from the existing calendar override endpoint, so grey blocked days can appear alongside imported external bookings.
- The website-side calendar enrichment now also merges accepted booking date keys and is shared across editor preview, internal draft preview, and published live-site rendering.
- Implemented templates now render a read-only availability snapshot card using the shared website model.
- The shared availability snapshot now supports month-to-month navigation in the preview/live calendar without leaving the website surface.
- Acceptance AWS wiring has been validated far enough for draft save/list behavior and the live-site foundation:
  - Aurora `main.standalone_site_draft`
  - Aurora `main.standalone_site`
  - Aurora `main.standalone_site_domain`
  - Aurora `main.standalone_site_event`
  - API Gateway `/property/website/draft` and `/property/website/drafts`
  - API Gateway `/property/website/site`, `/property/website/site/publish`, `/property/website/site/unpublish`
  - API Gateway `/property/website/public/resolve` and `/property/website/public/render`
  - CORS preflight on the new website routes
- Draft save/read now explicitly bypasses cache and the editor performs a read-after-write refresh to avoid stale draft payloads after saving.
- Building a website now keeps the Step 3 preview visible while the draft is saved, then shows a toast that the website is ready for review.
- An internal preview route exists at `/website-preview/:draftId`; it renders the saved draft through the real template instead of the dashboard preview frame.
- Saved website cards and the editor now expose `Open live site` actions.
- Draft editing and published live-site state are now deliberately separated:
  - `Save changes` updates only the working draft
  - `Update live site` pushes the current draft state into the published direct booking website snapshot
  - `Discard all changes` resets the working draft back to the currently published draft snapshot
- The editor save path now explicitly preserves the current published draft snapshot during a normal draft save, so `Save changes` no longer mutates the published live site implicitly.
- An already-open live-site tab now refreshes itself when the editor pushes a new live-site update, so hosts do not need to manually reload the published page after updating it.
- Text fields in the editor now highlight their corresponding preview target while editing, without activating preview highlights for section visibility toggles.
- Direct Booking Website KPIs now live on a dedicated host dashboard route instead of inside the website builder/workspace page.
- The direct booking website KPI route currently shows platform-wide aggregated data across Domits rather than host-scoped data.
- Direct Booking Website analytics now also ingest explicit builder timing events through a dedicated `/property/website/event` path, so build-start, build-success, build-failure, abandonment, and time-to-first-preview metrics are no longer inferred from draft timestamps.
- The KPI dashboard now keeps performance in one viewport-specific panel:
  - mobile, tablet, and desktop LCP are shown as separate viewport slices
  - each viewport combines earlier preview-route history with current live-site telemetry where available
- Phase 1 of the public-site lifecycle is now implemented:
  - `main.standalone_site` stores standalone-owned published site state separately from the editor draft
  - `main.standalone_site_domain` stores fallback-domain metadata separately from the site lifecycle record
  - the editor can publish and unpublish the direct booking website record without treating the draft row as the public website source of truth
  - fallback-domain assignment is now visible in the editor
- Phase 2 of the public runtime is now implemented:
  - published sites can be resolved through `GET /property/website/public/resolve`
  - published sites can be rendered through `GET /property/website/public/render`
  - the public runtime now renders from `standalone_site.published_property_snapshot_json` plus published overrides instead of reading brochure content through the draft preview path
  - a same-origin debug route exists at `/website-live/:domain` so hosts can test published-site rendering before real fallback-domain DNS is activated
  - the actual standalone-host root path can now render the published site when the current hostname matches the fallback-domain suffix
  - live LCP telemetry can now be emitted from the published-site runtime instead of remaining preview-only
  - when the primary domain status is `ACTIVE`, host actions should open the clean hostname directly; otherwise the UI falls back to the same-origin debug route

## Implemented page flow

### Step 1: Choose your listing

- Listing dropdown is implemented.
- Listings are loaded in the background using the host listing options endpoint.
- After a listing is selected, the page shows:
  - stacked property photos
  - listing title
  - location
  - status badge
  - short imported description
  - button to browse the imported photos

### Step 2: Choose a website template

- Template grid is implemented.
- Templates are displayed as silhouette previews.
- Templates can be selected.
- The current chosen template is reflected in the summary area below the grid.
- The selected state is visually indicated.

### Step 3: Build and preview website

- Clicking `Build my website` starts a real preview build workflow.
- The UI shows phase-based loading with pulse bars:
  - importing listing details
  - mapping content to template slots
  - rendering preview
- The page scrolls to Step 3 automatically when build starts.
- The built preview remains visible after draft persistence finishes.
- A toast confirms when the draft is saved and ready for review.
- Build failures are surfaced with retry controls.
- Builder KPI instrumentation now records:
  - build started
  - preview rendered and usable
  - build succeeded
  - build failed
    This is used to calculate time-to-first-preview p95, success rate, failure rate, and abandonment rate.

## Data flow status

Current data path:

- `hostDashboard/all` is used for listing selection and summary context.
- `hostDashboard/single` is fetched only for the selected listing when preview build starts.
- The detail payload is normalized into a canonical website content model before template rendering.

This split prevents dropdown payload bloat and keeps template rendering decoupled from list-fetch logic.

Calendar data path:

- `hostDashboard/single` now returns `calendarAvailability` for the selected host-owned property.
- The website model maps this into a shared availability object instead of letting each template interpret raw calendar payloads separately.
- The website detail fetch now uses `no-store`, and the host-owned property detail response also returns no-store headers to reduce stale calendar sync snapshots.
- Current rendered availability is intentionally a read-only imported snapshot:
  - external blocked dates
  - accepted booking date keys
  - PMS unavailable override dates
  - iCal sync state
  - sync metadata
- The same availability enrichment path is now reused by:
  - the host editor preview
  - `/website-preview/:draftId`
  - `/website-live/:domain`
- PMS-backed availability snapshot import is implemented in the current foundation. Authoritative server-side quote calculation for standalone guest traffic is designed, but not yet exposed as a live standalone public API.

## Template implementation status

Templates available in chooser:

- Panorama Landing
- Trust Signals
- Experience Journey
- Amenities Spotlight
- Gallery Grid
- Editorial Split
- Booking Focus
- Contact Focus
- Local Guide

Real preview rendering implemented:

- Panorama Landing
- Trust Signals
- Experience Journey

Silhouette-only (not yet real-rendered):

- Amenities Spotlight
- Gallery Grid
- Editorial Split
- Booking Focus
- Contact Focus
- Local Guide

Legacy hidden template kept for compatibility:

- Feature Stack

## Amenity icon status

- Amenity labels are mapped from selected listing detail data.
- Amenity icons are now rendered from the shared amenity catalog by amenity ID in the implemented templates.
- Icon fallback is safe: if an amenity icon is missing, label rendering continues.

## Animation and interaction status

Animations remain aesthetic/supportive and not business-critical:

- listing gallery overlay transitions
- selected template interaction and silhouette cursor motion
- phase-based preview build loading

Current implementation details:

- Templates are shown in a responsive grid.
- Card height and silhouette dimensions were normalized for consistency.
- Mobile and desktop layouts were tuned separately.
- The selected card has a distinct visual state.
- The selected template can be changed freely after listing selection.

## What is done now

- Setup and selection flow is complete.
- Real preview pipeline exists for the first three templates.
- Preview workflow logic is extracted into a dedicated script module and the internal preview route remains available for draft review.
- A dedicated public preview route now exists for saved drafts and can be opened from the workspace/editor for internal review.
- The shared preview route currently uses the draft id as the preview identifier. This is acceptable for acceptance/internal review, but should be replaced by a stronger preview token or signed-link strategy before treating preview URLs as production-grade private links.
- The shared preview route still resolves by `draftId`, which means it remains an internal preview mechanism and not the final public live-site runtime.
- Publishing now snapshots the currently approved draft state into a separate direct booking website record.
- Fallback-domain state is now tracked separately from site publication state:
  - a site can be `PUBLISHED`
  - while its fallback domain is still `PENDING`
    This separation is intentional and is required for the later routing phase.
- Shared template model is in place and reusable by additional templates.
- Built previews are persisted as website drafts keyed by host and property.
- Listings with an existing saved website are no longer offered again in the builder flow.
- Hosts can return to previously built drafts from the workspace overview tab.
- Saved drafts now open in a dedicated editor route instead of reusing Step 3 in the builder.
- Saved draft cards now render a clipped desktop-style website thumbnail instead of a mobile-biased preview.
- Implemented templates now honor draft visibility toggles for major sections.
- Panorama Landing now has the deepest editor coverage, including:
  - configurable contact footer
  - configurable amenities collection
  - dedicated residence section controls
  - dedicated calendar section controls
- Editor image slot reassignment now uses an overlay gallery with navigation and confirm-select behavior.
- Editor image slot reassignment now uses a thumbnail-only overlay grid with direct-select behavior.
- Shared image slots now support optional photo rotation, so a slot can render a lead image plus the imported listing set instead of staying fixed to one photo.
- Panorama residence now supports:
  - dedicated image-slot ownership instead of reusing the hero image
  - optional section panel with configurable color
  - editable title, headline, and description
- Calendar editing now supports:
  - editable title and description
  - independent panel toggle and panel color
  - month navigation controls in the rendered snapshot
- Amenities editing now supports:
  - add/delete/reorder up to the configured maximum
  - editable labels
  - editable icon choice from the shared amenity registry
  - shared amenity icon color override
- Contact footer editing now supports:
  - editable title and description
  - host/profile/initials avatar modes
  - custom uploaded avatar image
  - accent and footer background colors
- Editor field overflow issues were corrected by tightening field sizing/box-model behavior.
- Shared preview scaling was corrected so compact preview cards no longer reserve large unscaled whitespace.
- Editor save success/error feedback was moved into toast notifications to keep the editor surface cleaner.
- Preview-to-editor linking now exists for implemented templates so the preview can drive navigation to text/image editing areas.
- Editor-to-preview linking now also exists for active text editing, so the preview target is highlighted while a text field is focused or changing.
- Preview-to-editor linking now includes temporary section highlight feedback after navigation.
- The editor now renders per-section loading states while opening instead of replacing the whole page with one loader card.
- Editor sections now animate when expanding and collapsing.
- Host-side website detail payload now includes calendar availability and iCal sync metadata without introducing a new schema change.
- The website-side calendar sync snapshot path now uses the shared iCal source reader instead of a drifting duplicate query contract.
- Acceptance environment issues found during rollout were resolved:
  - missing unique index on `property_id` caused `ON CONFLICT` failure
  - missing `host_id` index had to be added separately for the intended draft-by-host access path
  - missing/incomplete CORS on website draft routes blocked browser fetches
- Published draft state now relies on separate standalone-owned fields in `main.standalone_site_draft`:
  - `published_content_overrides_json`
  - `published_theme_overrides_json`
    These fields must exist in `main` before backend code that reads/writes published draft state is deployed.
- Website KPI tracking now relies on a separate standalone-owned table in `main`:
  - `standalone_site_event`
    This table must exist in `main` before the website KPI overview can load successfully in the host dashboard.
- The standalone event stream now stores both server-side lifecycle events and client-perceived website analytics events:
  - builder events from the host dashboard
  - preview-route LCP events
  - published live-site LCP events
- The dedicated website KPI dashboard now also shows the broader research KPI set explicitly:
  - `time_to_publish_p95`
  - `cost_per_active_site_per_month`
  - `fallback_subdomain_availability`
  - `quote_to_charge_mismatch_rate`
  - `booking_api_error_rate`
  - `booking_funnel_completion_rate`
  - `custom_domain_setup_success_rate`
    Metrics without real instrumentation are shown as pending instead of fabricated values.
- The dedicated KPI dashboard now also exposes real build funnel metrics:
  - `build_started_count`
  - `build_succeeded_count`
  - `build_success_rate`
  - `build_failure_rate`
  - `build_abandonment_rate`
  - `time_to_first_preview_p95`
- The dedicated KPI dashboard now keeps its full page shell visible on first load and renders pulse-bar loaders inside the KPI sections while aggregated data is still loading.
- Trust-card icon selection is now editable from the website editor for templates that render those cards.
  Icon choices are sourced directly from the shared amenities registry, so newly added amenity icons automatically become available to the direct booking website editor without a separate icon list.
- The trust-card icon trigger is centered within the editable field and the icon-picker overlay now scales more safely across smaller viewports instead of behaving like a fixed desktop panel.
- The trust-card icon picker now deduplicates repeated amenity visuals and shows one option per unique Domits icon glyph instead of repeating the same icon for multiple amenity records.

## Next phase

The next high-priority phase is aligning the published-site runtime with real hosted fallback domains and then extending that foundation toward custom domains.

Required next steps:

- Extend the richer Panorama editor coverage into the remaining implemented templates so section contracts stay shared but template support becomes more even.
- Introduce image reordering / richer media management beyond the current slot reassignment approach.
- Finish fallback-domain infrastructure activation so `*.direct.domits.com` resolves to the published live site.
- Add custom-domain management on top of the existing `standalone_site_domain` model.
- Harden the internal preview URL strategy before broader production use:
  - add token rotation or preview-token hashing if draft UUID links are not considered sufficient
  - keep the preview route clearly separate from published live-site routing

## Additional implementation note

- The Website route still exists in the frontend.
- The Website tab button in the host dashboard navigation is currently commented out, so the page is hidden from the sidebar for now.
