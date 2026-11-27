# #3099 Let Elite hosts add their own properties to their website

Branch: `elite-site-properties-picker`, from `acceptance` (first built as `elite-site-properties-editor`). Issue: #3099
Result: no blocking findings. Review before every commit, the second review of the whole diff, each guard broken on purpose (39 of 44 caught).

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (8/10) | `useWebsiteEditorSiteProperties.js`, list edit | An edit is not tied to the main property, so an editor that switched property without unmounting would carry it over. | Accepted: `website/:propertyId` is only entered from the workspace, which unmounts the editor; the Pages edit is the same. Key the edit by property if a direct link is ever added. |
| P2 (9/10) | `WebsiteEditorPage.js`, update and publish | The draft is saved as published before the publish, and `publishWebsiteSite` can report a refused update as done. | Existing; `website-publish-result` fixes the report. The editor holds back a list with a listing it knows is not live or not the host's before any request. |
| P2 (8/10) | `hydratePersistedDraftRecord`; two tabs | An edit made while a save is in flight is dropped; the last save wins. | Existing for every editor field; unchanged. |
| P2 (7/10) | `discardDraftChanges` | Discard sends the published overrides, so it replaces a hidden working list and shows the server's text for a gone listing. | Existing behaviour of discard, pinned for hosts without the plan. |
| P3 (9/10) | listings read | No time limit: a hanging read keeps "Loading your listings...". | Accepted: the builder's own reader; nothing is lost. |
| P3 (8/10) | `applySitePropertiesEdit` | Back to one property keeps a one-entry list that is already published. | Accepted: only the API can store it; the site renders one property. |

Survivors: a stale listings answer (no overlapping reads remain), the cap and the main property guard in the hook (the UI offers neither action), edits before the listings load (no controls render), the stored-list shortcut (same JSON). Not in scope: the publish result, overview pages, a shared time limit.

Again on 2026-11-25, on `acceptance`. The main property is now always first and cannot move or be removed.

| Risk | Where it is closed |
|---|---|
| A normal editor save drops the list | Not edited, the stored list is sent back as it is; pinned for an Elite host on save and publish, and for every host without the section. A stored list with the main property further down is saved with it first, as the editor shows it. |
| Another host's or an inactive property | The draft save checks the owner of every new property (`authorizeSitePropertyOwners`); the publish checks owner and `ACTIVE` in its transaction (`site_property_not_active`); the render serves only the host's `ACTIVE` properties. |
| Duplicate or empty addresses, main removed | Checked in the editor with the server's rules, and refused by `normalizeSiteProperties` on save. |
| A host without `website.multi_property` | No section and no listings read; the publish snapshots nothing and the render serves no list. |
| Two tabs saving at once | Not closed: the last save wins, as for every editor field. The server checks the owner again for a property the stored draft no longer holds. |
| A property that becomes inactive while published | The render leaves it out at once and its pages show the not found page; the editor marks it and holds the next publish back. |

Second review, 2026-11-25: the stored order above (fixed), and an edit made while a save is in flight being reset by the answer (existing for every editor field, kept; see the third row of the first table).
