# Standalone Property Site Frontend Status

## Purpose
This document tracks the current implementation status of the host-side standalone website builder in the frontend. It captures what is production-real now, what is preview-only, and what the next phase must cover.

Historical iteration log:
- `docs/internal/apis/directbookingwebsite/standalone_property_site_implementation_log.md`

## Current status
The builder is no longer only a setup shell. It now builds a real in-dashboard preview from selected listing data for the first three templates and persists per-host website drafts.

What is in place:
- A dedicated website builder page with a step-based flow.
- Listing selection via host-owned listing options.
- Listings that already have a saved website draft are excluded from the builder dropdown until that website is deleted.
- Template chooser with silhouette previews.
- Real preview build flow for implemented templates.
- Data mapping from selected listing detail payload into a shared template model.
- Draft persistence to backend storage per host and property.
- Saved website draft overview tab (`My websites`) with dedicated editor-page entry.
- Dedicated draft editor page with controlled text override editing for:
  - website title
  - hero eyebrow
  - hero title
  - hero description
  - CTA label
  - CTA note
- Template-aware section visibility toggles for implemented templates.
- The availability calendar is part of the controlled visibility surface and can be shown or hidden per website draft.
- Image-slot selection for hero/gallery slots used by implemented templates, now driven through a visual image-picker overlay instead of dropdown-only controls.
- Editor save feedback now uses toast notifications instead of inline status copy inside the form.
- Image-slot picker now uses a compact thumbnail grid that can scale to larger imported photo sets without a large hero preview stage.
- Scaled preview rendering with dedicated desktop/tablet/mobile viewport switching in the editor.
- Compact scaled website preview cards inside `My websites`, with corrected thumbnail scaling, clipped preview height, and reduced card whitespace.
- Saved website cards display the persisted website title override when the host changes the title in the editor.
- Saved website cards now expose both `Open editor` and `Delete permanently`, so deleting a website immediately makes its listing available again in the builder.
- The saved website delete action is visually destructive/red and now opens an in-app confirmation overlay before deletion.
- Editor sections are now collapsible so the left-side control surface remains usable as more override fields are added.
- Clicking editable areas in the editor preview now opens or scrolls to the matching editor section, and clicking preview images opens the image picker directly.
- Clicking the availability calendar in the editor preview now opens the visibility section and highlights the `Show availability calendar` toggle.
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
- Implemented templates now render a read-only availability snapshot card using the shared website model.
- Acceptance AWS wiring has been validated far enough for draft save/list behavior:
  - Aurora `main.standalone_site_draft`
  - API Gateway `/property/website/draft` and `/property/website/drafts`
  - CORS preflight on the new website routes
- Draft save/read now explicitly bypasses cache and the editor performs a read-after-write refresh to avoid stale draft payloads after saving.
- Building a website now keeps the Step 3 preview visible while the draft is saved, then shows a toast that the website is ready for review.
- A first public preview route exists at `/website-preview/:draftId`; it renders the saved draft through the real template instead of the dashboard preview frame.
- Saved website cards and the editor expose `Open live preview` actions that open the draft preview link in a new tab.
- Text fields in the editor now highlight their corresponding preview target while editing, without activating preview highlights for section visibility toggles.

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
  - PMS unavailable override dates
  - iCal sync state
  - sync metadata
- Live quote requests remain the authoritative check before a guest can proceed.

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
- Preview workflow logic is extracted into a dedicated script module to support future dedicated preview route/new-tab flow.
- A dedicated public preview route now exists for saved drafts and can be opened from the workspace/editor.
- Shared template model is in place and reusable by additional templates.
- Built previews are persisted as website drafts keyed by host and property.
- Listings with an existing saved website are no longer offered again in the builder flow.
- Hosts can return to previously built drafts from the workspace overview tab.
- Saved drafts now open in a dedicated editor route instead of reusing Step 3 in the builder.
- Saved draft cards now render a clipped desktop-style website thumbnail instead of a mobile-biased preview.
- Implemented templates now honor draft visibility toggles for major sections.
- Editor image slot reassignment now uses an overlay gallery with navigation and confirm-select behavior.
- Editor image slot reassignment now uses a thumbnail-only overlay grid with direct-select behavior.
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

## Next phase
The next high-priority phase is extending the dedicated draft editor, not adding more long-term behavior into the builder page.

Required next steps:
- Expand section-level/content override coverage further into template-specific headings and branding/theme controls.
- Introduce image reordering / richer media management beyond the current slot reassignment approach.
- Add publish/unpublish state transitions and domain management hooks on top of stored drafts.
- Add preview URL strategy (in-page now, dedicated preview route/new tab later).
- Harden preview URL strategy before production publish:
  - add token rotation or preview-token hashing if draft UUID links are not considered sufficient
  - add publish/unpublish state transitions
  - add domain management hooks

## Additional implementation note
- The Website route still exists in the frontend.
- The Website tab button in the host dashboard navigation is currently commented out, so the page is hidden from the sidebar for now.
