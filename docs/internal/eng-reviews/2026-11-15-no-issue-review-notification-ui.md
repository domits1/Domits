# Host dashboard review notification UI

Pull request: not supplied
Issue: not supplied
Reviewed commit: e2aa319f9
Review base: origin/feat/review-alert-triggers (149be59fb), confirmed by user.
Result: one responsive defect reproduced and fixed; no remaining blocking findings.

## Scope decision

Context: comparison with local origin/acceptance includes 90 files (+5022/-675),
including inherited backend changes, violating this frontend PR's scope.
Options: use the parent feature branch, or isolate this commit onto acceptance.
Decision: user selected feat/review-alert-triggers as the review base.
Consequence: the PR must use that base to retain the reviewed four-file scope
(211 additions, one deletion before this review record).
No remote PR base was changed by this review.

## Findings

[P2] (confidence: 10/10) frontend/web/src/features/hostdashboard/notifications/Notifications.module.css:2:
the new bell caused the profile control to be clipped at a 320px viewport.
Evidence: line 1 sets `flex-shrink: 0`; line 2 sets `width: 44px`.
Header.js:390 retains `<img src={logo} width={150} alt="Logo" />`.
Existing header.scss:410 sets `grid-template-columns: 1fr auto auto`;
header.scss:372 sets the right-side `gap: 8px`.
Browser measurement before correction: profile right edge 350px at width 320px.
Decision: user requested browser validation; reduced logo width only in the host
header at widths up to 360px using a scoped CSS Module selector. At 320px the
profile right edge is now 308px. Existing 44px bell touch target is preserved.
Fix is in the working tree following reviewed commit e2aa319f9.

## Four passes

- Architecture: props-only data boundary; no new API or backend coupling.
  Shared Header imports the feature component and mounts it only on host routes.
- Code quality: isolated CSS, explicit alert types, React text escaping,
  listener cleanup and route-key reset. No verified blocking defect found.
- Tests: five focused tests cover previews/counts, mouse and keyboard dismissal,
  empty/loading/error states and count updates. Header route gating and full
  responsive layout are not covered by these component tests.
- Performance: linear count and preview rendering; one pointer listener while
  open. Appropriate for a small preview list; large-feed pagination is deferred.

## What already exists

Reuses the shared header, react-icons, CSS Modules and React Testing Library/Jest.
Host routes remain unchanged; existing menus close when the notification opens.

## Failure modes

| Path / failure | Test | Handling / visible outcome |
|---|---|---|
| No alerts | Yes | Clear empty status |
| Data still loading | Yes | Loading status and aria-busy |
| Parent reports error | Yes | Visible alert message |
| Escape / outside click / focus leaves | Yes | Closes; Escape restores bell focus |
| Route changes | No integration test | Header key remounts bell closed |
| Count changes / exceeds 99 | Yes | Updated accessible count; capped badge |
| Invalid timestamp | No | Invalid Date text; ISO input is caller contract |
| Narrow full header | Browser preview | Clipping reproduced at 320px and corrected |

## Data and state flow

    Header notificationAlerts prop
                  ▼
    NotificationBell (unread count, open state)
                  ▼
    NotificationDropdown (loading / error / empty / previews)

    closed ▶ bell selected ▶ open ▶ Escape / outside / blur / route ▶ closed

## Not in scope

- API, persistence and mark-read actions: explicitly excluded from this PR.
- Backend alert contracts: future adapter translates to the documented UI shape.
- Dashboard redesign: only header integration is authorized.
- Full-feed virtualization: no evidence of a large list requirement.

## Independent opinion and validation

An independent reviewer found no verified accessibility/dismissal defect and
identified the same narrow-screen concern, subsequently reproduced in browser.
No substantive disagreement. Five focused Jest tests passed during initial review.
Full Header, actual SearchBar and app.scss were bundled into a local-only preview;
authentication and destination lookup were stubbed and review alerts were mocks.
Opera browser checked iframe viewports at 320, 360, 390, 768 and 1280px after the
fix: logo, search, bell and profile remained inside each viewport. Open dropdowns
were visually checked at 320px and 1280px. This is component/header verification,
not authenticated dashboard end-to-end verification. No screenshot files committed.
Diff whitespace check passed. Post-fix Jest: two suites, 11 tests passed
(NotificationBell.test.js and existing HeaderDestinationsMenu.test.js).
