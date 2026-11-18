# Admin review dashboard styles: engineering review

Branch: `feat/admin-review-dashboard-styles`; base: `acceptance`; PR: [#3888](https://github.com/domits1/Domits/pull/3888); issue: [#3208](https://github.com/domits1/Domits/issues/3208).
Original review: 2026-11-12 at `78f96d80f`. Feedback fixes and validation: 2026-11-16, working tree based on `c3c00d37c`.

## Findings and decisions

The original engineering review reported no blocking findings. This follow-up addresses the responsive layout and metadata feedback; it does not claim a new independent engineering review.

Below 1280px, the list and details stack and details stop being sticky. Below 768px, navigation moves above the content, search and filter controls wrap, and review facts use a single column. Table scrolling remains inside `.tableCard`; long review text wraps.

Colour variables and the review header offset are scoped to `.shell` and `.page` in `ReviewApproval.module.css`, with an `--approval-` prefix. The responsive fixes remain in this module. The global `app.scss` and `header.scss` changes have been reverted and the global `:root` token file removed. Shared application tokens and header sizing are deferred to a separate follow-up PR; this change does not modify the real header or document offset.

## Validation

- All 38 classes referenced by the three approval components are defined.
- PostCSS parses the updated CSS Module; the complete application Sass compiles.
- `ReviewApprovalComponents.test.js`: all 13 tests pass.
- Chromium viewport checks at 1440, 768, 390 and 320 CSS pixels find no document overflow; tables retain internal horizontal scrolling. These checks were performed during the earlier feedback pass; the preview artifacts are not included in this checkout.
- Desktop, tablet and mobile screenshots were visually inspected. Long unbroken review text is included in the sample data.
- `git diff --check` passes.

## Visual evidence and limits

These are stylesheet previews using server-rendered `ReviewApprovalNavigation`, `ReviewApprovalTable` and `ReviewApprovalDetails`, sample data and a representative header. The toolbar is fixture markup. They do not validate the mounted page, authentication, API requests, live interactions or the production header. Repeat viewport checks after page integration. CI and mergeability must be checked on the final pushed commit.

## Scope correction validation

The global Sass files match `c3c00d37c` byte for byte. The CSS Module parses, all custom properties used by the module resolve locally except the existing application `--primary-color`, and the complete application Sass compiles. The responsive declarations and colour values are preserved. No new production-header screenshots are required for this scoped change.
