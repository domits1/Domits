# Standalone Property Site Frontend Status

## Purpose
This document tracks the current implementation status of the host-side standalone website builder in the frontend, so progress is easy to review before moving into actual template implementation.

## Current status
The website builder page is essentially complete as a selection and setup flow.

What is already in place:
- A dedicated website builder page has been created.
- The host can select one of their listings as the basis for a standalone property website.
- After selecting a listing, the page shows the selected listing context so the host can verify they picked the correct property.
- The template chooser is implemented and only appears after the listing has been selected.
- Multiple template options are already defined, rendered, and selectable.
- The builder flow is now structured step by step, with later steps only appearing after the previous step is completed.

## Implemented page flow
### Step 1: Choose your listing
- Listing dropdown is implemented.
- Listings are loaded in the background and become available in the selector.
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

## Implemented templates
The current template set includes:
- Panorama Landing
- Trust Signals
- Experience Journey
- Amenities Spotlight
- Gallery Grid
- Editorial Split
- Booking Focus
- Contact Focus
- Local Guide

There is also a hidden legacy template kept in code for compatibility:
- Feature Stack

## Display and selection status
The template previews are already implemented as visual silhouettes.

Current implementation details:
- Templates are shown in a responsive grid.
- Card height and silhouette dimensions were normalized for consistency.
- Mobile and desktop layouts were tuned separately.
- The selected card has a distinct visual state.
- The selected template can be changed freely after listing selection.

## Animations implemented
Animations were added mainly for aesthetic and preview purposes, not yet for product-critical behavior.

Current animations include:
- listing gallery overlay image transition when going next or previous
- stacked property photo entry animation in the selected-listing card
- selected template radio pulse animation
- decorative cursor movement inside template silhouettes
- subtle highlight/glow on silhouette sections when the decorative cursor interacts with them

The cursor animation system was refactored into a more expandable structure:
- template interaction sequence config
- shared cursor layer
- semantic silhouette targets
- shared interaction styling

This means new templates can be added later without hardcoding raw cursor coordinates for each one.

## What is effectively done now
At this stage, the builder page is largely done as a setup and selection experience.

That means:
- page structure is in place
- listing selection is in place
- selected listing verification is in place
- template display is in place
- template selection is in place
- aesthetic preview animations are in place

## Next logical focus
The next implementation phase should focus on the actual website output based on:
- the chosen listing
- the chosen template
- the imported listing data

The main next step is no longer the builder shell itself, but implementing how each selected template becomes a real standalone website using the selected listing information.

## Additional implementation note
- The Website route still exists in the frontend.
- The Website tab button in the host dashboard navigation is currently commented out, so the page is hidden from the sidebar for now.
