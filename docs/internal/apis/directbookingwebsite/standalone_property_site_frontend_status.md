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
- Template chooser with silhouette previews.
- Real preview build flow for implemented templates.
- Data mapping from selected listing detail payload into a shared template model.
- Draft persistence to backend storage per host and property.
- Saved website draft overview tab (`My websites`) with reopen-in-builder flow.

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
- Build failures are surfaced with retry controls.

## Data flow status
Current data path:
- `hostDashboard/all` is used for listing selection and summary context.
- `hostDashboard/single` is fetched only for the selected listing when preview build starts.
- The detail payload is normalized into a canonical website content model before template rendering.

This split prevents dropdown payload bloat and keeps template rendering decoupled from list-fetch logic.

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
- Shared template model is in place and reusable by additional templates.
- Built previews are persisted as website drafts keyed by host and property.
- Hosts can return to previously built drafts from the workspace overview tab.

## Next phase
The next high-priority phase is draft editing and publish lifecycle wiring.

Required next steps:
- Persist and edit section-level/content overrides instead of saving empty override payloads.
- Introduce per-draft detail page/route for dedicated editing and preview.
- Add publish/unpublish state transitions and domain management hooks on top of stored drafts.
- Add preview URL strategy (in-page now, dedicated preview route/new tab later).

## Additional implementation note
- The Website route still exists in the frontend.
- The Website tab button in the host dashboard navigation is currently commented out, so the page is hidden from the sidebar for now.
