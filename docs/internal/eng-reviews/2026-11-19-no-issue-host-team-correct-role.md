# fix: show the correct team role

Pull request: (to be opened)
Issue: none; reported by a colleague as hardcoded data in the role settings
Reviewed commit: see the step sections
Result: no blocking findings

## Step 1: invite email names the invited role

Reviewed: uncommitted changes on top of `63faa405a`, committed as `a5fe67992`

```
HostTeam invite form ── POST { email, role } ──▶ host-team controller.inviteMember
                                                     ▼
                                     service.inviteMember: normalizeRole(role)  (allow-list)
                                                     ▼
                                     repository.create(record with normalizedRole)
                                                     ▼
                                     sendTeamInviteEmail(email, token, hostEmail, normalizedRole)
                                                     ▼
                                     EmailNotificationService Lambda
```

The bug: every invite email said "Je bent uitgenodigd als Property Operations Manager op Domits." and "Als Property Operations Manager kun je alle reserveringen en accommodaties van de host beheren.", whatever role the host chose. `inviteMember` stored the chosen role but never passed it to `sendTeamInviteEmail`.

The fix: `service.js:47` passes `normalizedRole` as a fourth argument. `emailService.js` uses it in the first sentence ("Je bent uitgenodigd als ${role} op Domits.") and replaces the second with a role-neutral sentence that claims no specific permissions ("Met deze rol krijg je toegang tot het hostdashboard van deze host."). The link, subject and the rest of the email are unchanged; a test pins the link to `https://domits.com/team/accept?token=<token>`.

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (9/10) | `emailService.js:35-36`, `} catch {\n    }` | A failed send is swallowed: the invite is stored, the host sees "invitation sent", and the member never gets the email. No log line either. Pre-existing, not changed by this diff. | Accepted for this PR; see Not in scope. |
| P3 (5/10) | `emailService.js:7`, `async (toEmail, inviteToken, hostEmail, role)` | `role` has no default, so a future caller that leaves it out sends "uitgenodigd als undefined". The only caller (`service.js:47`) always passes the allow-listed role. | Accepted: one caller, covered by tests. |
| Checked | `service.js:30`, `const normalizedRole = normalizeRole(role);` | The value in the email has passed the allow-list, so it is always one of the 8 role names; no user text reaches the body. | No change. |
| Checked | tests | `service.test.js`: the normalized role (trimmed) and the default role are passed to the email; the real `emailService`, with the Lambda client mocked, sends a body that names the given role, does not contain "Property Operations Manager", and keeps the `https://domits.com` accept link. The new role tests failed before the change and pass after; host-team: 3 suites, 40 tests pass. | No change. |

Backend suite (`npm run test -- --testPathIgnorePatterns="test/PropertyHandler/end-to-end.test.js"`): 18 suites fail on the original code as well; `remoteLockTokenProvider` failed to run in the full run and passes alone, so it is flaky. None of them refer to host-team.

### Failure modes

| Failure | Test | Handling | Visible |
|---|---|---|---|
| `EmailNotificationService` invoke fails | No | Swallowed in `catch {}` | Nothing: the host sees success, the member gets no email. Critical gap, pre-existing. |
| Role missing from a future caller | No | None | The email says "undefined" |

## Step 2: Tasks settings shows the member's real role

Reviewed: uncommitted changes on top of `a5fe67992`

```
SettingsView (taskContext === "managed", managedHostId)
   ▼
fetchMemberships() ─▶ host-team getMemberships: Team_Member rows (role, host_id, ...) + host_name/host_email
   ▼
membership = teamMemberships.find(m => m.host_id === managedHostId)
   ▼
row 1: host        role "Host"                  (unchanged)
row 2: current user role membership?.role || ""  (was always "Property Operations Manager")
```

The bug: in Tasks › Settings, when a team member views a host they work for, their own row always said "Property Operations Manager", whatever role the host gave them. The role was available in the membership the component already loads, but the row used a fixed string.

The fix: `SettingsView.js:79` uses `membership?.role || ''`, the membership already found for `managedHostId`. When the role is not known (no membership loaded, or none for that host) the cell stays empty instead of showing a guessed role. The host's own row, the own-tasks branch, the "All" / "Active" values, the layout and the texts are unchanged.

Tests in `SettingsView.test.js`, new block "team rows when viewing a managed host", mocking `fetchMemberships` the way the file already does: a membership with role "Financial Manager" shows that role in the current user's row and "Property Operations Manager" nowhere in the table; a membership without a role leaves the cell empty. Both failed before the change and pass after; the existing 17 tests are unchanged and pass (19 of 19).

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (6/10) | `SettingsView.js:47`, `fetchMemberships().then(setTeamMemberships).catch(() => {});` | When the memberships request fails, the error is swallowed: the role cell is empty and the host row falls back to the raw `managedHostId`. No test covers the failed request. Pre-existing; this diff only changes what the empty case shows (empty instead of a guessed role). | Accepted: empty is the honest fallback; the swallowed error is listed under Not in scope. |
| P3 (5/10) | `SettingsView.js:130`, `<td>{member.role}</td>` | The role is shown as the raw English value from the backend, not translated. | Accepted: covered by the translation item under Not in scope. |
| Checked | `backend/functions/host-team/business/service/service.js:111-114` | `getMemberships` returns the full `Team_Member` row spread into the result, so `role` is present on every membership. | No change. |
| Checked | `SettingsView.js:74`, `teamMemberships.find(m => m.host_id === managedHostId)` | The same membership already supplies the host name and email; a member has at most one non-revoked invite per host (`inviteMember` rejects duplicates), so `find` picks the right row. | No change. |

Full web suite: pending, run in progress when this was written.

### Failure modes

| Failure | Test | Handling | Visible |
|---|---|---|---|
| Membership without a role | Yes | Empty role cell | Empty cell |
| Memberships request fails | No | Swallowed in `.catch(() => {})` | Empty role cell and the raw host ID as the host name |

## Not in scope

- Invites sent from acceptance link to `https://domits.com`: acceptance and main deploy to the same host-team Lambda, so an env var cannot tell the environments apart.
- The invite email is Dutch only.
- Role names and permission labels are not translated (Permissions column, role badges, dropdowns); the comment in `rolePermissionsSummary.js` saying the backend does not enforce roles is outdated.
- The role list is copied in host-team, property-tasks (`reviewRoles.js`, `pomService.js`), ReviewSystem (`reviewService.js`, `hostReviewRepository.js`) and the frontend, without a shared source or a contract test.
- Inline API URL, Cognito pool ID and region (codebase-wide pattern).
- English UI text in `TeamInviteModal`, `SettingsView` and `AcceptInvite`.
- A failed invite email is swallowed without a log or an error to the host (`emailService.js:35-36`).
- The Tasks settings team table still shows fixed "All" properties and "Active" status for every row; needs a product decision.
- `SettingsView.test.js` has 6 pre-existing `testing-library/no-unnecessary-act` lint errors.
- A failed memberships request in `SettingsView.js:47` is swallowed without a message.
