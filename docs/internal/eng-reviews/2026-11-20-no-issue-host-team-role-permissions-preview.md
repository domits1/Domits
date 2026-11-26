# feat(host-team): show the selected role's permissions in the invite and edit role dialogs

Pull request: (to be opened)
Issue: none
Reviewed: uncommitted changes on top of `539f763fa`
Result: no blocking findings

## What changed

```
invite dialog: inviteRole ───┐                      ┌─▶ <select aria-describedby="invite-role-permissions">
                             ├─▶ RolePermissionsPreview({ id, role, t })
edit dialog: editRoleValue ──┘        │              └─▶ <select aria-describedby="edit-role-permissions">
                                      ▼
                     <div id aria-live="polite">  label: t.columnPermissions
                                      ▼
                     PermissionsSummary({ role, t, collapseOverflow: false })
                                      ▼
                     getRolePermissionsSummary(role) ─▶ chips, or t.permissionsEmpty ("—")

table row ─▶ PermissionsSummary({ role, t })  collapseOverflow defaults to true: unchanged
```

When a host picks a role in the "Invite members" dialog or the "Edit role" dialog, the permissions of that role now show directly under the role dropdown, and update as soon as the selection changes.

- `PermissionsSummary` (`HostTeam.js:42`) gets an optional `collapseOverflow` prop, default `true`. With `true` the output is the same as before: chips from the third on get `team-permission-chip--overflow` and a "+N more" marker is rendered. With `false` neither is rendered, so a dialog always shows every permission, also on mobile.
- New `RolePermissionsPreview({ id, role, t })` (`HostTeam.js:71-76`) renders a label (`t.columnPermissions`) and `PermissionsSummary` with `collapseOverflow={false}`, inside a `div` with the given `id` and `aria-live="polite"`. It is used in both dialogs directly after the role `<label>`, before the error line (`HostTeam.js:477`, `:515`). It reads the existing controlled select value, so no new state was added.
- Each role `<select>` gets `aria-describedby` pointing at its preview (`invite-role-permissions`, `edit-role-permissions`): a screen reader reads the permissions when the select gets focus, and the live region announces the new list when the selection changes. Same pattern as `ReviewPage.js:212` / `:269`.
- Two CSS rules in `settingsDashboard.css:858-871`, both scoped under `.team-page`: `.team-modal-permissions` (column layout, `margin: -8px 0 16px` to sit close under the select) and `.team-modal-permissions-label` (the muted uppercase style of the mobile table labels). The chip styles are reused unchanged.
- No new translation keys: `t.columnPermissions` and `t.permissionsEmpty` already exist in en, nl, de and es.
- The table is unchanged: same markup, same classes, same mobile collapse.

## Tests

`HostTeam.test.js`, new `describe("HostTeam role permissions preview")`, all dialog assertions scoped with `within(screen.getByRole("dialog"))`:

1. The invite dialog on open shows the default role's permissions ("Bookings", "Listings"); the select's `aria-describedby` points at the `aria-live="polite"` element that contains them, and the select's accessible description contains them.
2. Changing the invite role to Financial Manager shows "Finances" and "Payouts", and "Listings" is gone from the dialog.
3. The edit dialog for the Reservation Manager member shows "Bookings" and "Messaging"; changing to Distribution Manager shows "Channels" and "Pricing", and "Bookings" is gone from the dialog.
4. General Manager in a dialog preview: "Finances" has no `team-permission-chip--overflow` class and there is no "+1 more".

The 4 new tests failed against the original `HostTeam.js` (`4 failed, 12 passed`) and pass with the change (`16 passed`). The 12 existing tests are unchanged and pass, including the table tests for chips, the empty "—" and the overflow marker (`HostTeam.test.js:96`, `:122`, `:136`).

ESLint: `HostTeam.js` is clean. `HostTeam.test.js` has 7 `testing-library/no-node-access` errors, the same 7 as on `539f763fa`; the new tests add none.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (8/10) | `HostTeam.test.js:207`, `expect(select).toHaveAttribute("aria-describedby", preview.id);` | Only the invite select's link to its preview is asserted. The edit select (`HostTeam.js:508`, `aria-describedby="edit-role-permissions"`) and its preview (`HostTeam.js:515`, `id="edit-role-permissions"`) are not: a typo in one of the two ids would pass every test and silently drop the description for screen readers. | Fixed: test 3 now asserts the edit select's aria-describedby and accessible description |
| P3 (6/10) | `HostTeam.js:466-477` and `HostTeam.js:504-515` | The role field is now repeated in both dialogs: `<label>`, `<select>` with the same options from `TEAM_INVITABLE_ROLES`, `aria-describedby`, and the preview. The repetition already existed for label and select; this change makes each copy longer. | Accepted: two cases, each one line of preview. Extract a role field component when a third dialog needs it. |
| P3 (5/10) | `HostTeam.js:72`, `<div className="team-modal-permissions" id={id} aria-live="polite">` | The preview is both the select's description and a live region. Some screen reader and browser combinations may announce the new permissions twice when the role changes with the arrow keys (once as the description, once as the live update). Could be a false positive; not verified with a screen reader. | Accepted: polite and short; check during the manual test. |
| P3 (4/10) | `HostTeam.test.js:206`, `getByText((_, element) => element?.getAttribute("aria-live") === "polite")` | A function matcher finds the live region by attribute. It is a little less explicit than a role query, but it throws if the dialog ever has zero or more than one polite region, so it fails loudly. | No change. |
| Checked | `HostTeam.js:48`, `:52` | With the default `collapseOverflow = true`, `overflowCount` is `items.length - 2` and `isOverflow` is `index >= 2`, the same expressions as before, so the table output is unchanged. Covered by `HostTeam.test.js:136-146`. | No change. |
| Checked | `HostTeam.js:337`, `<div className="page-body settings-page team-page">` | The dialogs (`team-modal-overlay`, `:444`, `:498`) render inside the `.team-page` root, so the new `.team-page`-scoped rules and the existing chip styles apply in the dialogs and nowhere else. | No change. |
| Checked | `settingsDashboard.css:862`, `margin: -8px 0 16px;` | Offsets the 16px `margin-bottom` of `.team-modal-label` (`:981`), so the preview sits 8px under the select and the next element keeps a 16px gap. | No change. |
| Checked | `HostTeam.js:470`, `:477`, `:508`, `:515` | The two ids are distinct, so they stay unique even if both dialogs were open at the same time. | No change. |

### Failure modes

| Failure | Test | Handling | Visible |
|---|---|---|---|
| Edit dialog for a member whose role is outside `TEAM_INVITABLE_ROLES` | No (the table's empty path is tested at `:122`) | `getRolePermissionsSummary` returns `[]`; the preview shows "—" | Yes, but the select shows its first option while the preview shows "—": the mismatch existed and is now visible. See Not in scope. |
| A role is added to `TEAM_INVITABLE_ROLES` without a `ROLE_PERMISSIONS_SUMMARY` entry | No | Same empty path | Yes, "—" under the select |
| One of the two `aria-describedby` ids drifts from its preview id | Yes, both dialogs (tests 1 and 3); test 3 fails when the edit preview id is changed to a wrong value | None at runtime | Nothing for sighted users; screen readers would lose the description, but the tests now catch it (finding 1) |

## Full suite

`CI=true npx react-scripts test --watchAll=false --maxWorkers=50%`: 292 suites pass, 2 fail, 6 skipped; 4186 tests pass, 2 fail, 47 skipped.

- `HostPayments.test.js`: 1 failure, known.
- `panoramaElitePagesPin.test.jsx`: 1 snapshot failure. It fails the same way on `539f763fa` without this change (`1 failed, 1 passed` both times, run alone), so it is not related.
- `listingDetails2.test.js`: passed.

## Manual check

<I will fill this in after testing in the browser>

## Not in scope

- The permission labels are display-only and come from `ROLE_PERMISSIONS_SUMMARY`; some do not match what the backend enforces (for example General Manager "Full access" cannot answer reviews). The label content is pending a product decision.
- The comment in `rolePermissionsSummary.js` saying the backend does not enforce roles is outdated.
- Role names and permission labels are not translated.
- A member with a role outside `TEAM_INVITABLE_ROLES`: the edit select shows the first option while the preview shows "—" (pre-existing mismatch, now visible).
- The default invite role is a hardcoded string (`HostTeam.js:159`, `:226` on `539f763fa`; `:169`, `:236` after this change).
- 7 pre-existing `testing-library/no-node-access` lint errors in `HostTeam.test.js`.
- `panoramaElitePagesPin.test.jsx` snapshot fails on acceptance (not related).
