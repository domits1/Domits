# Standalone Property Site Frontend Status

## Purpose
This document tracks the current implementation status of the host-side standalone website builder in the frontend. It captures what is production-real now, what is still preview-only, and what the next phase must cover.

## Current status
The builder is no longer only a setup shell. It now builds a real in-dashboard preview from selected listing data for the first three templates.

What is in place:
- A dedicated website builder page with a step-based flow.
- Listing selection via host-owned listing options.
- Template chooser with silhouette previews.
- Real preview build flow for implemented templates.
- Data mapping from selected listing detail payload into a shared template model.

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

## Next phase
The next high-priority phase is persistence. Current preview output is not saved yet.

Required next step:
- Persist built website config per host and property:
  - selected template
  - normalized/published content snapshot inputs
  - section-level overrides
  - branding/theme tokens
  - lifecycle state (draft/preview/published)

Without this, Step 3 remains an ephemeral render and hosts cannot return to previously built website drafts.

## Additional implementation note
- The Website route still exists in the frontend.
- The Website tab button in the host dashboard navigation is currently commented out, so the page is hidden from the sidebar for now.
