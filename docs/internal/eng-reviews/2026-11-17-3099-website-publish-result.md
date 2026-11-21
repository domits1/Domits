# #3099 Show a failed website publish as failed in the editor

Pull request: `website-publish-result`, from `acceptance`.
Issue: #3099
Reviewed: before each commit, then the pull request as a whole, then each guard broken on purpose.
Result: no blocking findings. 18 mutants, all caught; the code before the change fails 23 of the new tests. Second review: round one found the unreadable 200 answer and two test gaps (fixed); round two on the fixes found no defects.

A publish that the server refused still showed "Live site updated." when the site was live. `publishWebsiteSite` read the site after every answer that was not ok and counted any `PUBLISHED` site as a success, and the editor had a second copy of that recovery for the first publish (`recoverPublishedSiteSummary`, also after a failed draft save). Both were added in June for a publish that committed and then answered 500.

Now there is one recovery, in `websiteSiteService.js`, and only where the outcome is unknown:

| Answer | What the host sees |
|---|---|
| 200 | as before: "Live site updated." or "Live site published." |
| 400, 403, 404, 409, 429 | the API message, as a toast and in the Live site panel; the site is not read |
| Login cannot be refreshed or checked | "Your session has expired. Please log in again." or "We could not check your login right now. Please try again."; the site is not read |
| 500, 502, 503, 504, dropped connection, a 200 whose body cannot be read | the site is read up to three times (0, 250, 750 ms); success only when the site is `PUBLISHED` and its `publishedAt` is at or after the `updatedAt` of the draft saved for this publish; otherwise the publish error |
| Draft save fails | the save error; no publish, no site read |

Both times come from the server (the draft save, then the publish in a later request), so the client clock plays no part. A difference between server clocks can only show a publish that worked as failed; the host then publishes again.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (9/10) | `websiteSiteService.js`, `publishWebsiteSite` | A 200 whose body could not be read (connection lost after the headers) showed a publish that worked as failed; the removed editor recovery used to cover this for a first publish. | Fixed: it goes through the same recovery and proof as a 5xx. Tested both ways. |
| P3 (8/10) | `websiteSitePublishResult.test.js` | A guard of `savedAt === 0` instead of `<= 0`, and reads without the waits, passed the tests. | Fixed: a negative save time, and lower bounds on the elapsed time. |
| P3 (7/10) | `websiteSiteService.js`, `isPublishedSince` | The proof is "published at or after this draft save", not "this request": a publish from another editor tab in that second counts. | Accepted: two tabs on one draft are last write wins already, and the other tab's save also replaced this tab's draft. A content check would depend on how the server reshapes the overrides at publish. |
| P3 (7/10) | `websiteSiteService.js`, `findSiteSummaryPublishedSince` | A publish that commits more than about one second after a gateway timeout is shown as failed. | Accepted: the safe direction; publishing again gives the same result. |
| P4 (6/10) | `websiteSiteService.js`, `isPublishedSince` | An earlier publish that read the draft before this save and commits after it (a slow server after a gateway timeout) also counts as proof, while the live site then holds the older content. | Accepted: it needs two server failures in a row on the same site; the editor allows one publish at a time. |
| P2 (8/10) | `WebsiteEditorPage.js`, `persistDraftState({ syncPublishedState: true })` | The draft holds the new content as published before the publish answers, so after a failed update "Update live site" is enabled again only when the listing is stale or the host edits. | Not in this change (existed before); see Not in scope. |

## Not in scope

- After a failed update the draft already holds the new content as published (`persistDraftState({ syncPublishedState: true })` runs before the publish), so "Update live site" is enabled again only when the listing is stale or the host edits something. The failure stays in the Live site panel. This was already so before, when the same refusal showed as a success. A fix needs a choice on who sets the published content: the publish on the server, or the editor after a success.
- The browser message after a dropped connection ("Failed to fetch" and similar) is kept as it is today.
