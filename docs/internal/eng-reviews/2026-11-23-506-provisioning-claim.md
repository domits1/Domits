# feat(channex): claim a listing before provisioning (#506)

Pull request: not opened yet
Issue: #506
Reviewed commits: 9d448ab7b (design note), 4cea3a6f8 (refuse rule), a321109b7 (409 and SiteMinder code), b054fed1d (migration)
Result: no blocking findings; 2 P2 points fixed before their commit, the rest accepted

Each commit was reviewed on its staged diff before it was made. The design is D2 in `docs/partner/integrations/channel_manager/channex/channex_host_self_distribution_design.md`.

## Checked on live data first (20 Nov)

| Check | Result | Decision |
|---|---|---|
| Duplicates on account plus listing | One pair: two April test mappings of "test house" (`5f3fc6b0-…` 16 Apr, `cfc7f383-…` 23 Apr), disconnected account "Channex Test", inactive listing; 3 room types, 5 rate plans, 6 booking revisions, 109 sync-evidence rows attached | Archive the older one, delete nothing |
| Status values | `ACTIVE` 7, `active` 1 (legacy) | The index and the refuse rule cover both spellings |
| `test` schema | The integration tables do not exist there | Migration on `main` only |
| `DROP NOT NULL` on DSQL | Works (scratch table, created and dropped) | `externalPropertyId` nullable for the claim row |

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (7/10) | Design note, D2 | On Aurora DSQL the loser of a simultaneous claim can fail at commit with `40001`, not only on the unique key with `23505`; code that only catches `23505` gives the second tab a 500. | Fixed in the note: both codes mean "already in progress", neither is retried. Tests come with the claim code. |
| P2 (8/10) | `dsql_channel_property_claim_runbook.md` | The runbook did not say the migration must run after this PR is deployed; the old `upsert` could add a second in-use row in between (failed index build, or a 500 instead of a 409). | Fixed: "Deploy order" section. |
| P2 (9/10) | `channexMappingService.js` catch blocks | After the refuse commit, a refused save reached the generic catch and came back as 500. | Fixed in the next commit (409 `CHANNEX_PROPERTY_ALREADY_MAPPED`); never shipped. |
| P2 (8/10) | `siteMinderMappingService.js:53` | SiteMinder calls the same `upsert` and would see an error without a code. SiteMinder has no flow to move a listing to another hotel, so the refusal is correct. | Fixed: `SITEMINDER_PROPERTY_ALREADY_MAPPED`, like its other checks. SiteMinder owner to check (named in the PR). |
| P3 (8/10) | `integrationPropertyRepository.js` refuse query | A claim row has no Channex id, and `NULL <> :e` is not true in SQL, so a claim in progress would not count. | Fixed before the commit: `(externalPropertyId IS NULL OR externalPropertyId <> :e)`, with a test. |
| P3 (8/10) | Design note, D2 | `CREATE UNIQUE INDEX ASYNC` protects nothing until the job completes. | Runbook: do not deploy the provisioning route before block 8 `completed` and block 9 `indisvalid = t`. |
| P3 (6/10) | 409 message text | "Turn its OTAs off first" points to a step that is half manual in v1 (archiving has no screen). | Accepted: only admins reach this path; the Distribution tab shows its own text per `errorCode`. |
| P3 (5/10) | Migration `.sql`, archive `UPDATE` | `"updatedAt"` is not set on the archived row. | Accepted: nothing sorts on archived rows. |

## Decisions while designing (20 Nov)

- No delete: a partial unique key on in-use rows (`PROVISIONING`, `ACTIVE`, `active`) instead of a full key. A full key would also block a later reconnect next to an old row.
- A second Channex property for a listing is refused (409), not "last save wins": the mapping save only changes Domits' row, so the old Channex property would keep selling on the OTAs with availability Domits no longer updates (double-booking risk).
- Turning every OTA off keeps the mapping and the Channex property; turning one on again reuses them. `ARCHIVED` is only for a mapping replaced on purpose (admin step in v1).

## Tests

- `integrationPropertyRepository.upsertConflict.test.js`: refuse on insert and on re-activation, same Channex id still updates, a not-in-use save is never checked, the query including a claim with no Channex id.
- `channexMappingService.conflict.test.js`: 409 on both save paths, nothing else saved after a refusal.
- `siteMinderMappingService.propertyConflict.test.js`: SiteMinder's code, no room type linked.
- `test/ORM/channelIntegrationPropertyClaim.test.js`: nullable entity column, archive without delete, index columns, `main` only, record and rollback name the same index, and a fitness check that the index's status list equals `IN_USE_STATUSES` in the repository.

## Not in scope

- Applying the migration in DSQL: after this PR is merged and deployed, block by block per the runbook.
- The provisioning itself (Channex calls, claim code with `23505`/`40001`, timezone, account rows): the next PR.
- The two other copies of `qualifyTableName` and the lowercase `active` row: separate cleanups.
