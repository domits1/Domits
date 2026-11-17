# Clarify rate plan categories and copy

Pull request: #3770
Issue: #2799
Reviewed revision: `1baca8469e9e9173aa09ce1e81c5e1d3ab5ef00e` (initial category and copy update)
Result: no blocking findings

## Findings

- The Domits.com Booking Channel is informational and is not a link, so it should not display a navigation chevron. The follow-up renders the chevron only when a card has a destination, and the page test asserts that only the three navigable cards display one.

## What already exists

- The rate-plan settings page already reads its content from the localized `settings.ratePlans` objects.
- The Direct Booking Website, Direct Booking reservation-fee, and Enterprise detail pages and route targets already exist; the settings cards continue to use those same paths.
- The Domits.com host-only fee is informational in this view and remains non-navigable.

## Failure modes

- Missing translation values could leave a card label empty. The new category and all four card title/subtitle/note values are present in English, Dutch, German, and Spanish; the JSON files were parsed during the change. The new page test checks the English copy.
- A changed route target could send a host to the wrong plan page. Existing targets are retained, and the new page test asserts the three interactive card destinations.
- No API, billing, checkout, or subscription state changes are introduced by this presentation-only update.

## Not in scope

- Support Plans, including Implementation Plan and Support Plan, remain a follow-up as requested. Related implementation issues #3416 and #3411 are not included.
- Backend pricing, Stripe checkout, plan entitlements, and stored subscriptions are unchanged.
