# Admin review dashboard styles: engineering review

Branch: `feat/admin-review-dashboard-styles`; base: `acceptance`; PR: [#3888](https://github.com/domits1/Domits/pull/3888); issue: [#3208](https://github.com/domits1/Domits/issues/3208).
Original review: 2026-11-12 at `78f96d80f`. Feedback fixes and validation: 2026-11-16, working tree based on `c3c00d37c`.

## Findings and decisions

The original engineering review reported no blocking findings. This follow-up addresses the responsive layout and metadata feedback; it does not claim a new independent engineering review.

Below 1280px, the list and details stack and details stop being sticky. Below 768px, navigation moves above the content, search and filter controls wrap, and review facts use a single column. Table scrolling remains inside `.tableCard`; long review text wraps.

Shared colour and header-height tokens live in `frontend/web/src/styles/sass/tokens/_application.scss`, loaded by `app.scss`. The review module preserves its original colours through these tokens. The header, its menu inset, the document offset and the review shell now use the same `--app-header-height` value.

## Validation

- All 38 classes referenced by the three approval components are defined.
- PostCSS parses the updated CSS Module; the complete application Sass compiles.
- `ReviewApprovalComponents.test.js`: all 13 tests pass.
- Chromium viewport checks at 1440, 768, 390 and 320 CSS pixels find no document overflow; tables retain internal horizontal scrolling. Results: [viewport-checks.json](assets/admin-review-dashboard/viewport-checks.json).
- Desktop, tablet and mobile screenshots were visually inspected. Long unbroken review text is included in the sample data.
- `git diff --check` passes.

## Visual evidence and limits

These are stylesheet previews using server-rendered `ReviewApprovalNavigation`, `ReviewApprovalTable` and `ReviewApprovalDetails`, sample data and a representative header. The toolbar is fixture markup. They do not validate the mounted page, authentication, API requests, live interactions or the production header. Repeat viewport checks after page integration. CI and mergeability must be checked on the final pushed commit.

[Open the preview](assets/admin-review-dashboard/preview.html).

### Desktop — 1440px

![Desktop stylesheet preview](assets/admin-review-dashboard/desktop.png)

### Tablet — 768px

![Tablet stylesheet preview](assets/admin-review-dashboard/tablet.png)

### Mobile — 390px

![Mobile stylesheet preview](assets/admin-review-dashboard/mobile.png)

### Small mobile — 320px

![Small mobile stylesheet preview](assets/admin-review-dashboard/small-mobile.png)
