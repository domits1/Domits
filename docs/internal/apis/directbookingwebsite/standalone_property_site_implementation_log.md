# Standalone Property Site - Implementation Log (Append-Only)

## Purpose
This file is the chronological implementation log for the standalone website feature.  
Use it to trace what was implemented, when it was implemented, why decisions were made, and what changed in AWS/data flow.

## Rules
- Append-only: do not delete old entries.
- Do not rewrite past decisions; add a new corrective entry if direction changes.
- Every entry should include date, scope, key files, validation, and rollout impact.
- Use absolute dates (`YYYY-MM-DD`).

## Terminology note (2026-05-11)
- Older entries use `live preview` for the earlier shared published-preview flow.
- The current runtime model is:
  - internal draft preview at `/website-preview/:draftId`
  - published live-site rendering through `standalone_site` + `standalone_site_domain`
  - same-origin debug route at `/website-live/:domain`
- When reading older entries, treat `live preview` as the predecessor of the current `live site` lifecycle.

## Entry Template
```
## [YYYY-MM-DD] <short title>
Context:
Implementation:
Decision / Rationale:
AWS / Data impact:
Validation:
Open risks / Next:
Evidence (commit(s), file(s), docs):
```

---

## [2026-03-19] Website builder foundation and selection flow
Context:
Start of standalone website builder direction in host dashboard.

Implementation:
- Added initial builder flow with listing selection and template direction.
- Added/updated core design documentation for standalone site architecture baseline.

Decision / Rationale:
- Start from constrained v1 setup flow before introducing template rendering complexity.

AWS / Data impact:
- No new AWS data model changes.

Validation:
- Frontend flow verified manually during implementation.

Open risks / Next:
- Needed real template rendering and listing-detail mapping.

Evidence (commit(s), file(s), docs):
- `72da76b78` (`feat(standalone-site): add website builder selection flow and v1 design docs`)

## [2026-03-20] Listing preview integration in builder
Context:
Hosts needed meaningful listing context before choosing template.

Implementation:
- Added host listing preview context in builder page (title/location/photos/status summary).

Decision / Rationale:
- Reduce blind template selection and align chooser with real host listing data.

AWS / Data impact:
- Reused existing host listing API payload.

Validation:
- UI manual checks.

Open risks / Next:
- Required richer selected-listing detail fetch for real template rendering.

Evidence (commit(s), file(s), docs):
- `86ab42d36` (`feat(host-dashboard): add website builder listing preview page`)

## [2026-03-24] Template chooser expansion and style modularization
Context:
Chooser needed broader template options and maintainable styling structure.

Implementation:
- Expanded template options and chooser card interactions.
- Improved contrast/status styles.
- Split website builder styles into modular partials.
- Added frontend progress documentation.

Decision / Rationale:
- Keep feature development fast while preventing one-file style sprawl.

AWS / Data impact:
- No AWS schema/API changes.

Validation:
- Frontend manual checks and iterative visual QA.

Open risks / Next:
- Needed reusable silhouette model and interaction architecture.

Evidence (commit(s), file(s), docs):
- `562fad730`, `050c9a92d`, `0ac56ddb7`, `de2c5406c`, `6d3baa9ea`, `377a67e8d`, `1a0fd6080`, `bb530a9a7`

## [2026-03-26] Silhouette architecture refactor and interaction system
Context:
Template visuals and cursor animation logic were coupling too tightly to page code.

Implementation:
- Refactored to clearer template silhouette architecture and interaction modules.
- Improved step layout and flow clarity.

Decision / Rationale:
- Separate concerns (template metadata, silhouette structure, cursor/interaction logic).

AWS / Data impact:
- No AWS schema/API changes.

Validation:
- Visual/manual behavior checks.

Open risks / Next:
- Needed mobile scaling consistency and Sonar cleanup.

Evidence (commit(s), file(s), docs):
- `16c3506f2`, `2ea467d10`, `51dc2294e`, `f4b99b323`

## [2026-03-27] Sonar cleanup + mobile/render scaling corrections
Context:
Sonar findings and responsive rendering issues on template cards.

Implementation:
- Addressed Sonar maintainability findings in website template preview code.
- Fixed two-column mobile template chooser behavior.
- Fixed silhouette scaling/border overflow behavior.

Decision / Rationale:
- Stabilize maintainability and prevent mobile regressions before real rendering phase.

AWS / Data impact:
- No AWS schema/API changes.

Validation:
- Sonar pass iteration and mobile visual QA.

Open risks / Next:
- Needed silhouette parity refinement and real data-driven rendering.

Evidence (commit(s), file(s), docs):
- `9f46010c5`, `11407c8cb`, `336f200d9`, `4b4d5fd97`

## [2026-03-30] Silhouette visual parity refactor
Context:
Template silhouettes required tighter alignment with intended visuals.

Implementation:
- Refined silhouette appearances to match agreed template previews.

Decision / Rationale:
- Improve template selection fidelity and reduce mismatch with later rendered templates.

AWS / Data impact:
- No AWS schema/API changes.

Validation:
- Manual visual QA.

Open risks / Next:
- Needed actual rendered templates consuming listing data contract.

Evidence (commit(s), file(s), docs):
- `8a013b304`

## [2026-04-10] Real preview pipeline for first templates
Context:
Builder needed to move beyond silhouettes into real rendered preview from selected listing data.

Implementation:
- Added data-driven preview pipeline for first templates:
  - Panorama Landing
  - Trust Signals
  - Experience Journey
- Introduced canonical template model mapping from selected listing details.
- Added build phases in Step 3 preview with loader.
- Split listing data use:
  - `hostDashboard/all` for selection cards
  - `hostDashboard/single` for detailed render input
- Extracted preview workflow orchestration into dedicated service module.
- Added amenity icon rendering from shared amenity catalog.

Decision / Rationale:
- Keep chooser payload light, render payload rich, and template contract stable.
- Avoid per-template data interpretation drift.

AWS / Data impact:
- No new schema changes at this stage.
- Reused existing API surface.

Validation:
- Frontend build and manual preview flow checks.

Open risks / Next:
- Preview output was still ephemeral (not persisted per host/property).

Evidence (commit(s), file(s), docs):
- `318751eda`, `0b95601f7`
- Docs: `standalone_property_site_frontend_status.md`, `standalone_property_site_plan_of_approach.md`

## [2026-04-13] Persisted website drafts + host workspace overview
Context:
Hosts needed to return to previously built websites instead of rebuilding each session.

Implementation:
- Added backend draft persistence model and migration:
  - `main.standalone_site_draft`
- Added PropertyHandler draft endpoints:
  - `POST /property/website/draft`
  - `GET /property/website/drafts`
  - `GET /property/website/draft?property=<id>`
  - `DELETE /property/website/draft`
- Added repository with explicit schema resolution:
  - `TEST=true -> test`
  - non-test -> configured schema else `main`
- Added frontend `My websites` tab:
  - lists saved drafts
  - open draft in builder flow
- Preview build now auto-persists draft on successful render.
- Added dedicated AWS rollout playbook doc.

Decision / Rationale:
- Persistence is the required bridge from preview-only UX to editable/publishable website lifecycle.

AWS / Data impact:
- New Aurora table/indexes in schema `main`.
- API Gateway must expose new website draft routes.

Validation:
- Backend routing unit test passed.
- Frontend production build passed.
- Acceptance smoke plan documented.

Open risks / Next:
- Add draft override editing UI/model (currently saved as empty override objects).
- Add dedicated preview route/tab.
- Add publish/unpublish lifecycle and domain linking.

Evidence (commit(s), file(s), docs):
- Files:
  - `backend/ORM/migrations/20260410_standalone_site_draft.js`
  - `backend/ORM/models/Standalone_Site_Draft.js`
  - `backend/functions/PropertyHandler/data/repository/standaloneSiteDraftRepository.js`
  - `backend/functions/PropertyHandler/controller/propertyController.js`
  - `backend/functions/PropertyHandler/index.js`
  - `frontend/web/src/features/hostdashboard/website/WebsiteBuilderPage.js`
  - `frontend/web/src/features/hostdashboard/website/services/websiteDraftService.js`
- Docs:
  - `standalone_site_draft_aws_rollout.md`
  - `standalone_property_site_frontend_status.md`
  - `standalone_property_site_plan_of_approach.md`

## [2026-04-13] Sonar cleanup after persistence additions
Context:
New code introduced Sonar issues (duplication/readability/props validation).

Implementation:
- Extracted shared website API service helpers:
  - `resolveApiErrorMessage`
  - `getAuthorizedHeaders`
- Removed duplicated service logic in property/draft services.
- Reworked negated condition readability in builder page.
- Updated string normalization to use `replaceAll`.
- Removed redundant boolean call pattern in policy mapping.
- Added missing `model.site.title` prop validation in template components.

Decision / Rationale:
- Keep code review quality high and avoid introducing maintainability debt in new feature area.

AWS / Data impact:
- No additional AWS schema/API changes.

Validation:
- Frontend production build passed.
- Backend routing unit test passed.

Open risks / Next:
- Re-run Sonar on merged branch to verify quality gate closure in CI context.

Evidence (commit(s), file(s), docs):
- Files:
  - `frontend/web/src/features/hostdashboard/website/services/websitePropertyService.js`
  - `frontend/web/src/features/hostdashboard/website/services/websiteDraftService.js`
  - `frontend/web/src/features/hostdashboard/website/WebsiteBuilderPage.js`
  - `frontend/web/src/features/hostdashboard/website/rendering/buildWebsiteTemplateModel.js`
  - `frontend/web/src/features/hostdashboard/website/rendering/templates/PanoramaLandingTemplate.jsx`
  - `frontend/web/src/features/hostdashboard/website/rendering/templates/TrustSignalsTemplate.jsx`
  - `frontend/web/src/features/hostdashboard/website/rendering/templates/ExperienceJourneyTemplate.jsx`

## [2026-04-14] Acceptance AWS activation for website drafts
Context:
Draft persistence code existed, but acceptance still failed until the AWS side matched the implementation contract.

Implementation:
- Created `main.standalone_site_draft` in Aurora.
- Added API Gateway resources and methods for:
  - `/property/website/draft`
  - `/property/website/drafts`
- Fixed CORS preflight on the new website routes.
- Verified draft save/list behavior from the host dashboard.

Decision / Rationale:
- Keep standalone website persistence isolated in standalone-owned storage instead of mixing website state into existing `property_*` tables.
- The builder page is now a valid entry point, but not the long-term editing surface.

AWS / Data impact:
- Rollout exposed two concrete infrastructure constraints:
  - `ON CONFLICT (property_id)` requires a unique index on `property_id`
  - browser calls to new API Gateway resources require complete `OPTIONS`/CORS setup and redeploy

Validation:
- Browser flow reached successful draft persistence.
- `My websites` now shows persisted drafts.

Open risks / Next:
- The current reopen behavior still routes back into the builder flow.
- Next implementation should be a dedicated draft editor page that reads and writes `content_overrides_json` and `theme_overrides_json`.

Evidence (commit(s), file(s), docs):
- Acceptance verification notes:

## [2026-04-24] Website KPI tracking and delete-reason analytics
Context:
The standalone website workspace had draft persistence and preview sharing, but no operational visibility into how hosts were using website drafts or why they removed them.

Implementation:
- Added standalone website event storage:
  - `main.standalone_site_event`
- Added repository-backed KPI aggregation for standalone website metrics, later split into global and host-scoped use cases.
- Added PropertyHandler route:
  - `GET /property/website/kpis`
- Started recording website events for:
  - draft creation
  - draft save
  - shared preview open
  - live preview update
  - website deletion
- Wired selected website delete reasons from frontend into backend delete event payloads.
- Added KPI overview cards plus deletion-reason breakdown on a dedicated host dashboard route for standalone website analytics.
- Tightened website-specific backend 500 responses so internal error messages are no longer returned directly to the client.

Decision / Rationale:
- Website analytics should remain standalone-feature scoped rather than being mixed into existing property or platform KPI tables.
- Event writes are best-effort; analytics must never block draft save/delete/preview flows.
- Delete reasons are useful product signal, but they should be stored as website events instead of ad hoc frontend-only state.
- The first KPI dashboard is platform-wide and intended for internal/admin analysis. Host-specific website analytics can later build on the same event stream with a scoped endpoint.

AWS / Data impact:
- New Aurora table required in schema `main`:
  - `standalone_site_event`
- Acceptance API Gateway must expose:
  - `GET /property/website/kpis`
  - `OPTIONS /property/website/kpis`
- Existing website draft routes remain unchanged.

Validation:
- Backend routing unit test extended to cover `/property/website/kpis`.
- Frontend production build and website workspace flow to be revalidated after deploy.

Open risks / Next:
- KPI data is only as complete as the currently tracked event types; future live-site/custom-domain flows should emit their own events instead of overloading draft events.
- The KPI route depends on `main.standalone_site_event`; deploying backend/frontend before that table exists will surface KPI load failures in the dashboard.

Evidence (commit(s), file(s), docs):
- Files:
  - `backend/ORM/migrations/20260424_standalone_site_event.js`
  - `backend/ORM/models/Standalone_Site_Event.js`
  - `backend/functions/PropertyHandler/data/repository/standaloneSiteEventRepository.js`
  - `backend/functions/PropertyHandler/controller/propertyController.js`
  - `backend/functions/PropertyHandler/index.js`
  - `backend/test/PropertyHandler/routing-unit.test.js`
  - `frontend/web/src/features/hostdashboard/website/kpis/services/websiteKpiService.js`
  - `frontend/web/src/features/hostdashboard/website/services/websiteDraftService.js`
  - `frontend/web/src/features/hostdashboard/website/WebsiteBuilderPage.js`
  - `frontend/web/src/features/hostdashboard/website/_websiteBuilder.layout.scss`
  - `frontend/web/src/features/hostdashboard/website/_websiteBuilder.responsive.scss`
  - table `main.standalone_site_draft`
  - index `standalone_site_draft_property_unique`
  - API Gateway methods for `/property/website/draft(s)`

## [2026-04-14] Dedicated draft editor page with controlled text overrides
Context:
Persisted drafts were reachable from the workspace, but reopening them inside the builder kept the creation flow overloaded and mixed two different responsibilities.

Implementation:
- Added a dedicated draft editor route:
  - `/hostdashboard/website/:propertyId`
- Added editor page that:
  - loads saved draft record by property
  - loads selected property detail payload
  - rebuilds the canonical website model
  - applies saved `content_overrides_json`
  - exposes controlled text editing fields
  - saves updated overrides back into the same draft record
- Added initial override utility for:
  - `siteTitle`
  - `heroTitle`
  - `heroDescription`
  - `ctaLabel`
- Updated builder workspace actions so saved drafts open the dedicated editor instead of rebuilding Step 3 in place.

Decision / Rationale:
- Keep the builder focused on creation and first preview generation.
- Move long-term editing into a draft-specific page so future image editing, section controls, publish workflow, and domain setup do not bloat the builder.

AWS / Data impact:
- No new schema/API routes beyond existing draft persistence.
- Verified draft editor continues to rely on `main.standalone_site_draft`.
- Acceptance rollout also revealed the intended host-scoped access path should keep `standalone_site_draft_host_idx` present.

Validation:
- Frontend build to be used as the first structural validation checkpoint.
- Browser flow target:
  - save draft in builder
  - open draft from `My websites`
  - edit controlled fields
  - save and verify persisted override reload

Open risks / Next:
- Override coverage is still intentionally small.
- Image slot editing, section toggles, publish state, and domain linking still need implementation.

Evidence (commit(s), file(s), docs):
- Files:
  - `frontend/web/src/features/hostdashboard/website/WebsiteEditorPage.js`
  - `frontend/web/src/features/hostdashboard/website/WebsiteEditorPage.module.scss`
  - `frontend/web/src/features/hostdashboard/website/rendering/websiteDraftContentOverrides.js`
  - `frontend/web/src/features/hostdashboard/website/WebsiteBuilderPage.js`
  - `frontend/web/src/features/hostdashboard/mainDashboardHost.js`
- Docs:
  - `standalone_property_site_frontend_status.md`
  - `standalone_property_site_plan_of_approach.md`

## [2026-04-14] Editor override expansion + scaled preview cards
Context:
The first dedicated editor page worked, but its scope was too narrow: only a few text fields were editable, saved drafts still lacked a visual summary in the workspace, and preview scaling needed to behave like a controlled product surface instead of relying on incidental browser width changes.

Implementation:
- Expanded the draft override model to support:
  - common content fields (`siteTitle`, `heroEyebrow`, `heroTitle`, `heroDescription`, `ctaLabel`, `ctaNote`)
  - visibility overrides for major sections
  - image-slot overrides for hero/gallery positions
  - trust card copy overrides
  - journey stop copy overrides
- Updated implemented templates to honor visibility overrides.
- Added scaled preview rendering with viewport switching:
  - desktop
  - tablet
  - mobile
- Added compact scaled website previews to the `My websites` workspace cards.
- Kept all of this on top of the existing persisted `content_overrides_json` contract instead of introducing new tables prematurely.

Decision / Rationale:
- The builder page remains a creation flow.
- The editor page becomes the controlled configuration surface.
- Preview scaling belongs in the shared preview renderer, not in each page.
- Slot-based image reassignment is good enough for this phase and avoids fake “page builder” behavior.

AWS / Data impact:
- No new API routes or schema changes were required.
- Acceptance SQL still needs `standalone_site_draft_host_idx` present for the intended host-scoped draft list path.

Validation:
- Frontend production build used as structural validation after the refactor.
- Browser flow target:
  - open saved draft
  - change visibility/text/image slot overrides
  - save
  - refresh editor and workspace
  - confirm persisted override reload and compact preview update

Open risks / Next:
- Public publish/unpublish lifecycle and domain connection still do not exist.
- Editor surface still lacks full branding/theme control and richer section-specific copy.

Evidence (commit(s), file(s), docs):
- Files:
  - `frontend/web/src/features/hostdashboard/website/rendering/WebsiteTemplatePreview.jsx`
  - `frontend/web/src/features/hostdashboard/website/rendering/WebsiteTemplatePreview.module.scss`
  - `frontend/web/src/features/hostdashboard/website/rendering/websiteDraftContentOverrides.js`
  - `frontend/web/src/features/hostdashboard/website/rendering/templates/PanoramaLandingTemplate.jsx`
  - `frontend/web/src/features/hostdashboard/website/rendering/templates/TrustSignalsTemplate.jsx`
  - `frontend/web/src/features/hostdashboard/website/rendering/templates/ExperienceJourneyTemplate.jsx`
  - `frontend/web/src/features/hostdashboard/website/WebsiteEditorPage.js`
  - `frontend/web/src/features/hostdashboard/website/WebsiteEditorPage.module.scss`
  - `frontend/web/src/features/hostdashboard/website/WebsiteBuilderPage.js`
- Docs:
  - `standalone_property_site_frontend_status.md`
  - `standalone_property_site_plan_of_approach.md`

## [2026-04-15] Draft persistence hardening for editor saves
Context:
Draft save feedback reported success, but re-opening the editor later could still surface stale draft content. That is not acceptable for a draft editor. The system needs to prove the saved version is the persisted version.

Implementation:
- Added `cache: "no-store"` to website draft list/read/write fetches in the frontend draft service.
- Changed editor save flow to perform a read-after-write fetch of the draft after a successful upsert.
- Added no-store response headers on standalone website draft controller responses so API/cache layers do not hand the frontend stale payloads.

Decision / Rationale:
- Draft editing is stateful and user-trust sensitive. Returning stale GET responses after a save makes the feature feel broken even if the write succeeded.
- Read-after-write is the right discipline here because it verifies the persisted payload instead of trusting a local optimistic assumption.

AWS / Data impact:
- No Aurora schema change.
- No API Gateway route change.
- Draft endpoints now return cache-busting headers; this is backward-compatible.

Validation:
- Frontend production build passed:
  - `react-scripts build`

Evidence (commit(s), file(s), docs):
- Files:
  - `frontend/web/src/features/hostdashboard/website/services/websiteDraftService.js`
  - `frontend/web/src/features/hostdashboard/website/WebsiteEditorPage.js`
  - `backend/functions/PropertyHandler/controller/propertyController.js`
- Docs:
  - `standalone_property_site_frontend_status.md`

## [2026-04-15] Editor feedback cleanup and compact media selection
Context:
The dedicated draft editor worked, but two UX issues remained:
- save feedback was still rendered inline inside the form
- image selection overlay spent most of its space on one oversized preview image

Implementation:
- Replaced inline "Draft changes saved." feedback with toast notifications.
- Simplified image selection overlay into a thumbnail-first grid with direct-select behavior.
- Removed oversized preview-stage/navigation controls from the overlay.
- Tightened `My websites` compact preview cards by clipping preview height and reducing preview width.

Decision / Rationale:
- Save feedback should not take persistent space inside the editor form.
- Thumbnail-first image picking scales better when properties have tens of imported photos.
- Saved-draft overview cards should behave like summaries, not miniature full-page browsers.

AWS / Data impact:
- No AWS or schema change.

Validation:
- Frontend production build passed after editor/preview adjustments.

Open risks / Next:
- If imported photo counts grow significantly, add lightweight search/filtering inside the image picker.
- Continue with publish/unpublish lifecycle and domain workflow after editor UX is stable.

Evidence (commit(s), file(s), docs):
- Files:
  - `frontend/web/src/features/hostdashboard/website/WebsiteEditorPage.js`
  - `frontend/web/src/features/hostdashboard/website/WebsiteEditorPage.module.scss`
  - `frontend/web/src/features/hostdashboard/website/WebsiteBuilderPage.js`
  - `frontend/web/src/features/hostdashboard/website/rendering/WebsiteTemplatePreview.jsx`
  - `frontend/web/src/features/hostdashboard/website/rendering/WebsiteTemplatePreview.module.scss`
- Docs:
  - `standalone_property_site_frontend_status.md`

## [2026-04-15] Editor navigation and collapsible control surface
Context:
The dedicated editor had started to accumulate enough controls that the left panel became cumbersome to navigate. At the same time, the preview could show editable content but did not help the user reach the corresponding editor controls.

Implementation:
- Added collapsible editor sections for common content, visibility, image slots, trust cards, and journey stops.
- Added preview-to-editor linking for implemented templates.
- Clicking preview images now opens the image picker directly.
- Clicking preview text/copy sections now expands and scrolls to the matching editor area.
- Reworked compact saved-draft preview rendering to use a more deterministic summary-thumbnail approach instead of relying only on background hydration.

Decision / Rationale:
- The editor should remain controlled and structured, not degrade into a long scrolling wall of inputs.
- The preview should act as a navigation surface for the editor, not just a passive render.

AWS / Data impact:
- No AWS or schema change.

Validation:
- Frontend production build passed after template/editor/preview wiring changes.

Open risks / Next:
- The saved-draft card preview still needs real browser verification after the compact render refactor.
- Next major phase remains publish/unpublish and domain workflow.

Evidence (commit(s), file(s), docs):
- Files:
  - `frontend/web/src/features/hostdashboard/website/WebsiteEditorPage.js`
  - `frontend/web/src/features/hostdashboard/website/WebsiteEditorPage.module.scss`
  - `frontend/web/src/features/hostdashboard/website/rendering/WebsiteTemplatePreview.jsx`
  - `frontend/web/src/features/hostdashboard/website/rendering/WebsiteTemplatePreview.module.scss`
  - `frontend/web/src/features/hostdashboard/website/rendering/templates/PanoramaLandingTemplate.jsx`
  - `frontend/web/src/features/hostdashboard/website/rendering/templates/TrustSignalsTemplate.jsx`
  - `frontend/web/src/features/hostdashboard/website/rendering/templates/ExperienceJourneyTemplate.jsx`
- Docs:
  - `standalone_property_site_frontend_status.md`

## [2026-04-15] Calendar availability import, compact preview cleanup, and visual image picker
Context:
The dedicated editor and workspace were functionally usable, but three product issues remained obvious:
- saved-draft preview cards reserved excessive whitespace because scaled previews still behaved like full-size layout boxes
- image-slot selection used a dropdown instead of a visual picker
- the website model ignored calendar availability and iCal sync metadata even though the website feature needs to communicate current availability honestly

Implementation:
- Extended host-owned property detail fetch path so website-related host detail payloads include `calendarAvailability`.
- Extended external calendar repository/service response to include:
  - imported blocked dates
  - iCal sync presence
  - sync-source count
  - last sync timestamp
  - source metadata list
- Extended the shared website template model with an availability snapshot object.
- Added a reusable read-only availability preview component and rendered it in the three implemented templates.
- Fixed scaled preview shell behavior so compact preview cards use the actual scaled height instead of leaving large blank space.
- Tightened `My websites` card structure and reduced preview width so saved website previews behave like thumbnails rather than oversized page slices.
- Reworked editor image-slot reassignment from dropdown-only selection into an overlay picker with:
  - large preview
  - next/previous navigation
  - thumbnail rail
  - explicit confirm-select action
- Fixed editor field overflow by enforcing better input sizing behavior inside the editor panel.

Decision / Rationale:
- Calendar visibility should be honest and controlled:
  - imported calendar snapshot for preview and public render context
  - live quote API remains authoritative for booking correctness
- A visual media picker is appropriate for images; a dropdown is not.
- Shared preview scaling must be solved in the renderer, not with page-specific layout hacks.

AWS / Data impact:
- No new Aurora schema change was required.
- No new API Gateway routes were required.
- Backend response contract for host-owned property detail was expanded in a backward-compatible way.
- Existing acceptance SQL requirement still stands:
  - `main.standalone_site_draft`
  - unique index on `property_id`
  - host index on `host_id`

Validation:
- Backend routing unit test passed:
  - `test/PropertyHandler/routing-unit.test.js`
- Frontend production build passed:
  - `react-scripts build`

Open risks / Next:
- Availability snapshot currently reflects imported external calendar blocks and sync metadata, not a full booking-engine calendar.
- Publish/unpublish lifecycle and domain connection are still the next major product step.
- Richer branding/theme controls and image ordering still remain open.

Evidence (commit(s), file(s), docs):
- Files:
  - `backend/functions/PropertyHandler/business/service/propertyService.js`
  - `backend/functions/PropertyHandler/data/repository/propertyExternalCalendarRepository.js`
  - `frontend/web/src/features/hostdashboard/website/rendering/buildWebsiteTemplateModel.js`
  - `frontend/web/src/features/hostdashboard/website/rendering/AvailabilityCalendarPreview.jsx`
  - `frontend/web/src/features/hostdashboard/website/rendering/AvailabilityCalendarPreview.module.scss`
  - `frontend/web/src/features/hostdashboard/website/rendering/WebsiteTemplatePreview.jsx`
  - `frontend/web/src/features/hostdashboard/website/rendering/WebsiteTemplatePreview.module.scss`
  - `frontend/web/src/features/hostdashboard/website/rendering/templates/PanoramaLandingTemplate.jsx`
  - `frontend/web/src/features/hostdashboard/website/rendering/templates/TrustSignalsTemplate.jsx`
  - `frontend/web/src/features/hostdashboard/website/rendering/templates/ExperienceJourneyTemplate.jsx`
  - `frontend/web/src/features/hostdashboard/website/WebsiteEditorPage.js`
  - `frontend/web/src/features/hostdashboard/website/WebsiteEditorPage.module.scss`
  - `frontend/web/src/features/hostdashboard/website/WebsiteBuilderPage.js`
  - `frontend/web/src/features/hostdashboard/website/_websiteBuilder.layout.scss`
- Docs:
  - `standalone_property_site_frontend_status.md`
  - `standalone_property_site_plan_of_approach.md`

## [2026-04-17] Builder availability guard, calendar-sync hardening, and editor interaction polish
Context:
The standalone website feature had three remaining product-quality gaps:
- the builder still offered listings that already had a saved website attached
- the website-side calendar snapshot could drift from the PMS/iCal sync state seen in the host calendar tab
- the editor interaction model was functional but still rough, with hard section jumps, a single blocking loader, and abrupt expand/collapse behavior

Implementation:
- Filtered the builder listing dropdown so any listing with an existing saved website draft is hidden until that website is deleted.
- Disabled the builder listing selector while draft availability is still loading so listings do not briefly appear and then disappear once draft data arrives.
- Hardened website property detail fetches with `cache: "no-store"`.
- Returned no-store headers from `GET /property/hostDashboard/single` for host-owned property detail reads used by the website feature.
- Replaced the website-side external calendar repository’s duplicated source-table query logic with the shared iCal source reader used by the iCal service.
- Added defensive timestamp normalization for `last_sync_at` / `updated_at`, which are not stored as clean numeric values in the current Aurora contract.
- Added section-level editor loading shells using `PulseBarsLoader` while the draft editor is opening.
- Added animated expand/collapse behavior for editor sections instead of hard mount/unmount switching.
- Added preview-to-editor highlight feedback so clicking a preview target now scrolls to the matching section and briefly flashes that section.
- Tightened the compact saved-website preview so it renders against a mobile-biased viewport and uses a fixed summary-width column.

Decision / Rationale:
- The builder must respect saved website ownership, otherwise the same listing can be re-used into conflicting website drafts.
- The website calendar snapshot should not use a drifting duplicate interpretation of `property_ical_source` when the iCal flow already has a shared reader contract.
- Editor UX should stay structured and responsive as the override surface grows; keeping the shell visible and animating section behavior is cleaner than hard blocking or hard jumping.

AWS / Data impact:
- No new Aurora schema change.
- No new API Gateway routes.
- Host-owned property detail responses now carry no-store headers for website-related reads.
- Existing draft table/index requirements remain unchanged:
  - `main.standalone_site_draft`
  - unique index on `property_id`
  - host index on `host_id`

Validation:
- Frontend production build passed:
  - `react-scripts build`
- Backend routing unit test passed:
  - `test/PropertyHandler/routing-unit.test.js`

Open risks / Next:
- Compact saved-preview rendering should still be visually verified in the browser after the latest width/viewport adjustments.
- If PMS/iCal data still diverges after these changes, the next step is to inspect live `property_ical_source` rows for a real property and compare them against `LIST_SOURCES` output from the iCal service.
- Next major feature phase remains publish/unpublish and domain workflow.

Evidence (commit(s), file(s), docs):
- Files:
  - `frontend/web/src/features/hostdashboard/website/WebsiteBuilderPage.js`
  - `frontend/web/src/features/hostdashboard/website/services/websitePropertyService.js`
  - `frontend/web/src/features/hostdashboard/website/rendering/WebsiteTemplatePreview.jsx`
  - `frontend/web/src/features/hostdashboard/website/rendering/WebsiteTemplatePreview.module.scss`
  - `frontend/web/src/features/hostdashboard/website/WebsiteEditorPage.js`
  - `frontend/web/src/features/hostdashboard/website/WebsiteEditorPage.module.scss`
  - `frontend/web/src/features/hostdashboard/website/_websiteBuilder.layout.scss`
  - `backend/functions/PropertyHandler/controller/propertyController.js`
  - `backend/functions/PropertyHandler/data/repository/propertyExternalCalendarRepository.js`
- Docs:
  - `standalone_property_site_frontend_status.md`

## [2026-04-17] Workspace deletion flow, desktop compact previews, and host-calendar enrichment fallback
Context:
Three UX/consistency issues remained after the previous editor polish pass:
- saved website cards still needed direct deletion controls
- compact website thumbnails had drifted into a mobile-looking render instead of a desktop-style summary
- website preview calendar parity still needed a stronger bridge to the same iCal data used by the host calendar tab

Implementation:
- Added frontend delete support for saved website drafts from `My websites`.
- Added a dedicated `DELETE` draft service call and refreshed workspace state after removal.
- Removed the builder helper text that announced how many listings were hidden because of existing website drafts.
- Simplified the editor left-panel header from explanatory copy to a clean `Editor` title only.
- Switched compact website thumbnails back to a desktop-style layout by using a dedicated compact desktop viewport width instead of forcing the compact renderer into mobile mode.
- Enriched the website-side property detail fetch with `dbListIcalSources(propertyId)` as a host-side fallback/merge path so blocked dates and sync-source counts can align with the host calendar sync view even when the standalone property detail payload is lagging.
- Made website calendar blocked days visually explicit by rendering imported external-booking styling and labels instead of relying on a subtle background tint.

Decision / Rationale:
- The workspace must allow direct lifecycle control over saved websites; reopening a draft is not enough.
- A compact summary thumbnail should still read as the chosen desktop website, not as a separate mobile preview mode.
- For host-side preview/editor flows, reusing the same iCal source payload already trusted by the host calendar tab is the pragmatic way to close calendar parity gaps without inventing a parallel contract.

AWS / Data impact:
- No new Aurora schema change.
- No new API Gateway route.
- No acceptance SQL change.

Validation:
- Frontend production build passed:
  - `react-scripts build`

Open risks / Next:
- Calendar parity still needs browser verification on a real property with imported external bookings.
- If the website calendar still diverges after this fallback merge, inspect the live `hostDashboard/single` response and the `LIST_SOURCES` payload side by side for the same property.

Evidence (commit(s), file(s), docs):
- Files:
  - `frontend/web/src/features/hostdashboard/website/WebsiteBuilderPage.js`
  - `frontend/web/src/features/hostdashboard/website/services/websiteDraftService.js`
  - `frontend/web/src/features/hostdashboard/website/services/websitePropertyService.js`
  - `frontend/web/src/features/hostdashboard/website/rendering/WebsiteTemplatePreview.jsx`
  - `frontend/web/src/features/hostdashboard/website/rendering/AvailabilityCalendarPreview.jsx`
  - `frontend/web/src/features/hostdashboard/website/rendering/AvailabilityCalendarPreview.module.scss`
- Docs:
  - `standalone_property_site_frontend_status.md`

## [2026-04-17] Website calendar parity for PMS blocked dates
Context:
The website-side availability snapshot already showed imported external bookings, but it still missed PMS-side unavailable override dates that were visible in the host calendar tab. That made the standalone website calendar under-report blocked dates.

Implementation:
- Enriched the website property-detail merge path with the existing `GET /property/calendar/overrides` endpoint.
- Parsed override rows where `isAvailable === false` into `unavailableDateKeys`.
- Extended the shared website availability model to carry:
  - `externalBlockedDates`
  - `unavailableDateKeys`
  - separate summaries/counts for both categories
  - a total blocked-date summary and next blocked label based on the union
- Updated the website availability preview so:
  - imported external bookings stay striped with an external label
  - PMS blocked dates render as grey blocked cells with a blocked icon
  - the legend and metadata pills distinguish both sources clearly

Decision / Rationale:
- The correct behavior is not “iCal only.” The website preview must reflect both imported external bookings and host-side PMS unavailable overrides, otherwise availability parity is misleading.
- Reusing the existing override endpoint is the pragmatic fix because it already powers the host calendar editing flow.

AWS / Data impact:
- No new Aurora schema change.
- No new API Gateway route.
- Reused existing `calendar/overrides` API surface.

Validation:
- Frontend production build passed:
  - `react-scripts build`

Open risks / Next:
- If any real property still shows a mismatch after this, inspect the actual override payload returned by `GET /property/calendar/overrides?propertyId=...` for that listing and compare it against the host calendar state.

Evidence (commit(s), file(s), docs):
- Files:
  - `frontend/web/src/features/hostdashboard/website/services/websitePropertyService.js`
  - `frontend/web/src/features/hostdashboard/website/rendering/buildWebsiteTemplateModel.js`
  - `frontend/web/src/features/hostdashboard/website/rendering/AvailabilityCalendarPreview.jsx`
  - `frontend/web/src/features/hostdashboard/website/rendering/AvailabilityCalendarPreview.module.scss`
  - `frontend/web/src/features/hostdashboard/website/WebsiteBuilderPage.js`
- Docs:
  - `standalone_property_site_frontend_status.md`

## [2026-04-20] Calendar preview to visibility-toggle targeting
Context:
After making the availability calendar toggleable, clicking the calendar in the preview needed to take the host directly to the corresponding show/hide control.

Implementation:
- Added editor target IDs for visibility controls.
- Registered visibility toggle rows as precise editor targets.
- Made the availability calendar root accept preview interaction props.
- Connected Panorama Landing, Trust Signals, and Experience Journey calendar previews to `visibility.availabilityCalendar`.

Decision / Rationale:
- Preview-to-editor navigation should land on the exact editable control, not just the broad editor section.
- Keeping the target ID in the template preserves the existing renderer/editor contract.

AWS / Data impact:
- No Aurora schema change.
- No API Gateway change.
- No Lambda change.

Validation:
- Frontend production build passed:
  - `react-scripts build`

Evidence (commit(s), file(s), docs):
- Files:
  - `frontend/web/src/features/hostdashboard/website/WebsiteEditorPage.js`
  - `frontend/web/src/features/hostdashboard/website/rendering/AvailabilityCalendarPreview.jsx`
  - `frontend/web/src/features/hostdashboard/website/rendering/WebsiteTemplatePreview.module.scss`
  - `frontend/web/src/features/hostdashboard/website/rendering/templates/PanoramaLandingTemplate.jsx`
  - `frontend/web/src/features/hostdashboard/website/rendering/templates/TrustSignalsTemplate.jsx`
  - `frontend/web/src/features/hostdashboard/website/rendering/templates/ExperienceJourneyTemplate.jsx`
- Docs:
  - `standalone_property_site_frontend_status.md`

## [2026-04-20] Availability calendar visibility toggle
Context:
The website preview availability calendar needed to be optional like other controlled sections in the editor.

Implementation:
- Added `availabilityCalendar` to the managed visibility override contract.
- Added `Show availability calendar` controls for Panorama Landing, Trust Signals, and Experience Journey.
- Made all three implemented templates conditionally render the availability calendar from the shared visibility flag.
- Added the flag to fallback draft previews and the canonical website template model defaults.

Decision / Rationale:
- The calendar is a full website section, not fixed template chrome, so it belongs in the same controlled visibility surface as gallery, amenities, trust cards, CTA, and chat.
- This keeps the renderer contract stable for future public publish because the draft stores one explicit visibility override.

AWS / Data impact:
- No Aurora schema change.
- No API Gateway change.
- No Lambda change.
- Existing `content_overrides_json.visibility` can store the new key without migration.

Validation:
- Frontend production build passed:
  - `react-scripts build`

Evidence (commit(s), file(s), docs):
- Files:
  - `frontend/web/src/features/hostdashboard/website/WebsiteBuilderPage.js`
  - `frontend/web/src/features/hostdashboard/website/WebsiteEditorPage.js`
  - `frontend/web/src/features/hostdashboard/website/rendering/websiteDraftContentOverrides.js`
  - `frontend/web/src/features/hostdashboard/website/rendering/buildWebsiteTemplateModel.js`
  - `frontend/web/src/features/hostdashboard/website/rendering/WebsiteTemplatePreview.jsx`
  - `frontend/web/src/features/hostdashboard/website/rendering/templates/PanoramaLandingTemplate.jsx`
  - `frontend/web/src/features/hostdashboard/website/rendering/templates/TrustSignalsTemplate.jsx`
  - `frontend/web/src/features/hostdashboard/website/rendering/templates/ExperienceJourneyTemplate.jsx`
- Docs:
  - `standalone_property_site_frontend_status.md`

## [2026-04-20] Website title and hero eyebrow binding fixes
Context:
Saved website cards still displayed the original listing title instead of the edited website title, and two implemented templates were still using hardcoded hero eyebrow labels.

Implementation:
- Made `My websites` derive the visible card title from `contentOverrides.siteTitle` before falling back to the listing title.
- Connected Trust Signals hero eyebrow rendering to `model.hero.eyebrow`.
- Connected Experience Journey hero eyebrow rendering to `model.hero.eyebrow`.
- Updated template PropTypes to include the hero eyebrow field.

Decision / Rationale:
- Templates must consume the canonical website model instead of embedding fixed copy where editable fields exist.
- The workspace overview should reflect the persisted website draft state, not only the original listing snapshot.

AWS / Data impact:
- No Aurora schema change.
- No API Gateway change.
- No Lambda change.

Validation:
- Frontend production build passed:
  - `react-scripts build`

Evidence (commit(s), file(s), docs):
- Files:
  - `frontend/web/src/features/hostdashboard/website/WebsiteBuilderPage.js`
  - `frontend/web/src/features/hostdashboard/website/rendering/templates/TrustSignalsTemplate.jsx`
  - `frontend/web/src/features/hostdashboard/website/rendering/templates/ExperienceJourneyTemplate.jsx`
- Docs:
  - `standalone_property_site_frontend_status.md`

## [2026-04-20] Saved website deletion confirmation overlay
Context:
The saved website delete action needed to match the destructive button style used elsewhere and should not delete immediately from a single button click.

Implementation:
- Renamed the saved website delete action to `Delete permanently`.
- Replaced the browser confirm call with an in-page confirmation overlay.
- Kept the existing draft delete endpoint and refresh behavior.
- Updated the destructive button styling to use a filled red button with white text.

Decision / Rationale:
- Browser confirm dialogs are inconsistent with the rest of the host dashboard and are not good enough for a persistent workspace action.
- The listing itself is not deleted, so the overlay explicitly states that only the saved website draft is removed.

AWS / Data impact:
- No Aurora schema change.
- No API Gateway change.
- No Lambda change.

Validation:
- Frontend production build passed:
  - `react-scripts build`

Evidence (commit(s), file(s), docs):
- Files:
  - `frontend/web/src/features/hostdashboard/website/WebsiteBuilderPage.js`
  - `frontend/web/src/features/hostdashboard/website/_websiteBuilder.layout.scss`
- Docs:
  - `standalone_property_site_frontend_status.md`

## [2026-04-20] Visitor contact widget and workspace destructive-action polish
Context:
The workspace delete action was visually too neutral, and standalone website previews needed an early contact-widget surface so visitors can message the host from a generated website.

Implementation:
- Styled the saved website delete action as a destructive red button in `My websites`.
- Added `chatWidget` to the managed visibility override contract.
- Added a `Show chat widget` visibility toggle for the implemented templates.
- Added a reusable website contact widget rendered by the shared preview shell instead of duplicating widget markup per template.
- Added a website contact service that reuses the unified messaging send service with generated visitor id, host id, property id, and thread context.
- Added host id to the canonical website template model source data.

Decision / Rationale:
- Delete is destructive and should not look like a normal secondary action.
- The chat widget belongs at the shared preview/render layer because it is template-agnostic.
- The current implementation reuses the unified messaging send path, but the future public website should still get a dedicated public contact endpoint contract instead of depending on host-dashboard assumptions.

AWS / Data impact:
- No new Aurora schema change.
- No new API Gateway route in this slice.
- The widget currently uses the existing unified messaging API used by host messages.

Validation:
- Frontend production build passed:
  - `react-scripts build`

Open risks / Next:
- Before public launch, define a proper public website contact endpoint that validates site/property/host context server-side and rate limits anonymous visitor messages.
- Add anti-abuse controls before exposing this on public domains.

Evidence (commit(s), file(s), docs):
- Files:
  - `frontend/web/src/features/hostdashboard/website/WebsiteBuilderPage.js`
  - `frontend/web/src/features/hostdashboard/website/_websiteBuilder.layout.scss`
  - `frontend/web/src/features/hostdashboard/website/WebsiteEditorPage.js`
  - `frontend/web/src/features/hostdashboard/website/rendering/websiteDraftContentOverrides.js`
  - `frontend/web/src/features/hostdashboard/website/rendering/buildWebsiteTemplateModel.js`
  - `frontend/web/src/features/hostdashboard/website/rendering/WebsiteTemplatePreview.jsx`
  - `frontend/web/src/features/hostdashboard/website/rendering/WebsiteTemplatePreview.module.scss`
  - `frontend/web/src/features/hostdashboard/website/rendering/WebsiteContactWidget.jsx`
  - `frontend/web/src/features/hostdashboard/website/services/websiteContactService.js`
- Docs:
  - `standalone_property_site_frontend_status.md`

## [2026-04-20] Public draft preview link and editor-to-preview feedback
Context:
The builder could persist website drafts, but opening a generated website still happened only inside the dashboard/editor flow. The first live-preview link needed to exist before publish/domain work can be designed honestly. The builder also needed to keep the generated preview visible after saving instead of dropping back into a refreshed state.

Implementation:
- Added a public draft preview API path:
  - `GET /property/website/preview?draft=<draftId>`
- Added draft lookup by draft id in the standalone draft repository.
- Added a top-level frontend route:
  - `/website-preview/:draftId`
- Added a public preview page that:
  - fetches the saved draft and property details
  - rebuilds the canonical website template model
  - applies persisted content overrides
  - renders the chosen template directly, not inside the dashboard preview browser frame
  - respects the saved contact-widget visibility flag
- Added `Open live preview` actions from:
  - `My websites`
  - the dedicated editor page
- Fixed the builder flow so the generated Step 3 preview remains visible after draft persistence.
- Replaced build-save inline feedback with a toast notification that the website is built and ready for review.
- Added editor-to-preview highlighting for text edits:
  - common text fields
  - trust card copy
  - journey stop copy
- Kept section visibility toggles out of active preview highlighting while editing, because those controls affect section presence rather than text content.

Decision / Rationale:
- A preview URL is the correct stepping stone before publish/unpublish and domain routing. It proves the saved draft can render outside the host dashboard shell.
- Rendering the public preview through the real template keeps the route close to future public-site behavior.
- The current preview identifier is the draft UUID. That is acceptable for internal/acceptance preview, but not the final public-domain security model.

AWS / Data impact:
- No Aurora schema change.
- New API Gateway route/method required:
  - `GET /property/website/preview`
  - public/no Cognito authorizer for the preview fetch, because access is by draft id
  - CORS `OPTIONS` for browser access
- Existing table remains:
  - `main.standalone_site_draft`

Validation:
- Frontend production build passed:
  - `react-scripts build`
- Backend routing unit test passed:
  - `test/PropertyHandler/routing-unit.test.js`

Open risks / Next:
- Before production publish, replace bare draft-id preview access with a stronger preview token or published-site route contract.
- Add publish/unpublish transitions so public links can be intentionally enabled/disabled instead of relying only on draft existence.
- Add domain routing after the preview route is stable.

Evidence (commit(s), file(s), docs):
- Files:
  - `backend/functions/PropertyHandler/controller/propertyController.js`
  - `backend/functions/PropertyHandler/data/repository/standaloneSiteDraftRepository.js`
  - `backend/functions/PropertyHandler/index.js`
  - `backend/test/PropertyHandler/routing-unit.test.js`
  - `frontend/web/src/App.js`
  - `frontend/web/src/features/hostdashboard/website/WebsiteBuilderPage.js`
  - `frontend/web/src/features/hostdashboard/website/WebsiteEditorPage.js`
  - `frontend/web/src/features/hostdashboard/website/WebsitePublicPreviewPage.jsx`
  - `frontend/web/src/features/hostdashboard/website/WebsitePublicPreviewPage.module.scss`
  - `frontend/web/src/features/hostdashboard/website/services/websitePublicPreviewService.js`
  - `frontend/web/src/features/hostdashboard/website/rendering/WebsiteTemplatePreview.jsx`
  - `frontend/web/src/features/hostdashboard/website/rendering/WebsiteTemplatePreview.module.scss`
  - `frontend/web/src/features/hostdashboard/website/rendering/templates/PanoramaLandingTemplate.jsx`
  - `frontend/web/src/features/hostdashboard/website/rendering/templates/TrustSignalsTemplate.jsx`
  - `frontend/web/src/features/hostdashboard/website/rendering/templates/ExperienceJourneyTemplate.jsx`
- Docs:
  - `standalone_property_site_frontend_status.md`
  - `standalone_property_site_implementation_log.md`

## [2026-04-21] Workspace delete-reason dialog and compact thumbnail optimization
Context:
The saved website workspace needed tighter mobile behavior and a more useful delete flow. The compact website preview was also too small to justify loading full web-sized images.

Implementation:
- Centered compact saved website previews on mobile cards.
- Changed compact draft preview model hydration to request thumbnail image variants.
- Mapped persisted web-image overrides back to thumbnail URLs where the selected property image payload exposes both variants.
- Replaced the plain delete confirmation copy with a reason-selection dialog using checkbox options.
- Made the delete overlay close when clicking outside the dialog.
- Emphasized that deleting a website draft does not delete the listing itself.

Decision / Rationale:
- The workspace card preview is a tiny summary, so thumbnail images are the correct default. Blurry is acceptable there; unnecessary image weight is not.
- Deletion reasons are valuable product data, but wiring them to persistence should come later with a deliberate analytics/event contract instead of stuffing it into the draft delete endpoint casually.

AWS / Data impact:
- No Aurora schema change.
- No API Gateway change.
- No Lambda change.
- Delete reason selections are currently UI-only and not persisted.

Validation:
- Frontend production build passed:
  - `react-scripts build`
- Backend routing unit test passed:
  - `test/PropertyHandler/routing-unit.test.js`

Open risks / Next:
- Persist delete reasons through a dedicated analytics/event path when product wants actual reporting.
- Browser-check compact preview centering on a real mobile viewport after deployment.

Evidence (commit(s), file(s), docs):
- Files:
  - `frontend/web/src/features/hostdashboard/website/WebsiteBuilderPage.js`
  - `frontend/web/src/features/hostdashboard/website/_websiteBuilder.layout.scss`
  - `frontend/web/src/features/hostdashboard/website/_websiteBuilder.responsive.scss`
  - `frontend/web/src/features/hostdashboard/website/rendering/buildWebsiteTemplateModel.js`
- Docs:
  - `standalone_property_site_frontend_status.md`
  - `standalone_property_site_implementation_log.md`

## [2026-04-24] Draft state split from shared preview state
Context:
Saving draft edits and publishing preview-link updates were previously collapsing into one effective state, which made the shared preview link behave like the working draft instead of a separately controlled published preview.

Implementation:
- Added published preview state fields to standalone website draft storage:
  - `published_content_overrides_json`
  - `published_theme_overrides_json`
- Updated the draft repository and PropertyHandler controller to read/write those fields explicitly.
- Updated the editor so:
  - `Save changes` only persists the working draft
  - `Update live preview` publishes the current editor state to the shared preview link
  - `Discard all changes` resets the working draft back to the published preview version
- Updated the public preview page to render only the published preview overrides instead of falling back to working-draft overrides.
- Added a cross-tab preview refresh signal so an already-open preview tab reloads itself after `Update live preview`.

Decision / Rationale:
- The host needs two distinct states:
  - editable draft state
  - shared preview/live state
- Without this split, preview links are not trustworthy because they can accidentally expose unpublished edits.

AWS / Data impact:
- Requires standalone-owned columns in `main.standalone_site_draft` for published preview state.
- These columns are not created just by deploying frontend/backend code.
- The schema change must be applied in Aurora `main` before backend code that selects those fields is activated.

Validation:
- Backend routing tests passed.
- Frontend production build passed.
- Editor workflow verified for:
  - save without preview update
  - update preview link explicitly
  - discard back to published preview state

Open risks / Next:
- Preview links still use raw draft ids and should be hardened before production public exposure.
- The same split should later back real publish/unpublish + custom-domain live state.

Evidence (commit(s), file(s), docs):
- Files:
  - `backend/functions/PropertyHandler/data/repository/standaloneSiteDraftRepository.js`
  - `backend/functions/PropertyHandler/controller/propertyController.js`
  - `backend/ORM/migrations/20260424_standalone_site_published_state.js`
  - `frontend/web/src/features/hostdashboard/website/WebsiteEditorPage.js`
  - `frontend/web/src/features/hostdashboard/website/WebsitePublicPreviewPage.jsx`
  - `frontend/web/src/features/hostdashboard/website/services/websitePreviewSync.js`
  - `docs/internal/apis/directbookingwebsite/standalone_property_site_frontend_status.md`
  - table `main.standalone_site_draft`
  - index `standalone_site_draft_property_unique`
  - API Gateway methods for `/property/website/draft(s)`

## [2026-04-24] Corrective fix for draft-save leaking into shared preview
Context:
The first draft/published split implementation still allowed a normal `Save changes` action to affect the shared preview state in practice. That meant the product behavior still violated the intended contract.

Implementation:
- Updated the standalone draft repository upsert path so published preview fields no longer fall back to current draft overrides during a normal update.
- Updated the editor save flow to send the currently persisted published preview overrides back with a normal draft save, preserving published state explicitly instead of relying on backend inference.
- Kept `Update live preview` as the only editor action that should write new published preview overrides.

Decision / Rationale:
- Draft vs shared preview state cannot be left to implicit fallback logic. The save contract must be explicit, otherwise the host cannot trust that unpublished edits stay unpublished.

AWS / Data impact:
- No new schema change.
- No API Gateway change.
- This fix depends on the previously added published preview columns already existing in `main.standalone_site_draft`.

Validation:
- Backend routing tests passed.
- Frontend production build passed.
- Browser workflow verified for:
  - save draft without changing live preview
  - explicitly update live preview
  - discard back to published preview state

Open risks / Next:
- Real publish/unpublish and domain-backed live state still need to be built on top of this same draft/published separation.

Evidence (commit(s), file(s), docs):
- Files:
  - `backend/functions/PropertyHandler/data/repository/standaloneSiteDraftRepository.js`
  - `frontend/web/src/features/hostdashboard/website/WebsiteEditorPage.js`
  - `docs/internal/apis/directbookingwebsite/standalone_property_site_frontend_status.md`

## [2026-04-29] Trust-card icons made editor-configurable from amenities registry
Context:
Quick-scan and trust-card icons were still hardcoded in the template layer. That meant hosts could not change them from the editor, and newly added amenity icons would never become selectable for standalone websites.

Implementation:
- Extended the trust-card content model with `iconAmenityId`.
- Added icon defaults to the shared trust-card builders so existing drafts and previews still render meaningful icons.
- Added an editor-side icon selector for templates whose trust-card sections render icons.
- Sourced icon choices directly from the shared amenities registry instead of creating a separate website-only icon catalogue.
- Updated the panorama and trust-signals templates to render trust-card icons from the selected amenity icon id.
- Hardened the shared `IconWrapper` so icon overrides such as `className`, `sx`, and accessibility props are forwarded correctly.

Decision / Rationale:
- Icon choice belongs to the same editable content contract as trust-card title and description.
- Reusing the amenities registry avoids duplication and keeps standalone website icon availability automatically aligned with the rest of Domits.

AWS / Data impact:
- No Aurora schema change.
- No API Gateway change.
- No Lambda change.
- This slice is frontend-only and persists through existing draft content overrides.

Validation:
- Frontend production build passed.

Open risks / Next:
- If a future template needs card-specific icon sizing or grouping rules that differ from the current amenity registry, those rules should be added as presentation metadata rather than introducing a second icon source of truth.

Evidence (commit(s), file(s), docs):
- Files:
  - `frontend/web/src/store/iconWrapper.js`
  - `frontend/web/src/features/hostdashboard/website/rendering/amenityIconRegistry.js`
  - `frontend/web/src/features/hostdashboard/website/rendering/buildWebsiteTemplateModel.js`
  - `frontend/web/src/features/hostdashboard/website/rendering/websiteDraftContentOverrides.js`
  - `frontend/web/src/features/hostdashboard/website/rendering/templates/PanoramaLandingTemplate.jsx`
  - `frontend/web/src/features/hostdashboard/website/rendering/templates/TrustSignalsTemplate.jsx`
  - `frontend/web/src/features/hostdashboard/website/rendering/templates/templatePropTypes.js`
  - `frontend/web/src/features/hostdashboard/website/WebsiteBuilderPage.js`
  - `frontend/web/src/features/hostdashboard/website/WebsiteEditorPage.js`
  - `frontend/web/src/features/hostdashboard/website/WebsiteEditorPage.module.scss`
  - `frontend/web/src/features/hostdashboard/website/websiteEditorConfig.js`
  - `frontend/web/src/features/hostdashboard/website/rendering/WebsiteTemplatePreview.module.scss`

## [2026-04-28] Research KPI catalogue surfaced in dashboard
Context:
The KPI dashboard already exposed real standalone website usage metrics, but it still missed the broader KPI set defined in the research. That made implementation and evaluation drift apart.

Implementation:
- Extended the dedicated KPI dashboard UI to show the research KPI set explicitly:
  - `time_to_publish_p95`
  - `cost_per_active_site_per_month`
  - `site_lcp_mobile_p75`
  - `fallback_subdomain_availability`
  - `quote_to_charge_mismatch_rate`
  - `booking_api_error_rate`
  - `booking_funnel_completion_rate`
  - `custom_domain_setup_success_rate`
- Added criteria tags so each KPI stays linked to the research categories.
- Marked non-instrumented KPIs clearly as pending instead of inventing placeholder values.
- Kept the current global usage metrics and deletion-reason analytics unchanged.

Decision / Rationale:
- The dashboard should reflect the research model honestly.
- Showing KPI names now is useful, but only if the page makes it explicit which metrics are truly instrumented and which still require platform work.

AWS / Data impact:
- No Aurora schema change.
- No API Gateway change.
- No Lambda change.
- This slice is frontend-only and consumes the existing KPI endpoint.

Validation:
- Frontend production build passed.

Open risks / Next:
- When publish flow, public domains, performance telemetry, and booking flow are implemented, the backend KPI contract should be extended so these research KPIs can move from pending to real measured values.

Evidence (commit(s), file(s), docs):
- Files:
  - `frontend/web/src/features/hostdashboard/website/kpis/WebsiteKpiDashboardPage.js`
  - `frontend/web/src/features/hostdashboard/website/kpis/services/websiteKpiService.js`
  - `frontend/web/src/features/hostdashboard/website/_websiteBuilder.layout.scss`
  - `frontend/web/src/features/hostdashboard/website/_websiteBuilder.responsive.scss`
  - `docs/internal/apis/directbookingwebsite/standalone_property_site_frontend_status.md`

## [2026-04-28] KPI dashboard loading state aligned with host dashboard patterns
Context:
The dedicated standalone website KPI dashboard already used the shared pulse-bars loader, but it still replaced too much of the page during the initial fetch. That made the page feel like a blank state instead of a stable dashboard shell with loading metrics.

Implementation:
- Kept the KPI dashboard shell visible immediately on route entry.
- Moved the loading experience inside the KPI cards and deletion-reason panel so the page now shows pulse-bar loaders where values are still being fetched.
- Disabled the refresh action while the initial KPI request is in flight.

Decision / Rationale:
- This matches the interaction pattern already used across host dashboard surfaces such as stats cards, calendar, and website builder flows.
- Users should see the KPI layout immediately, with only the data points in a loading state.

AWS / Data impact:
- No Aurora schema change.
- No API Gateway change.
- No Lambda change.
- This slice is frontend-only.

Validation:
- Frontend production build passed.

Evidence (commit(s), file(s), docs):
- Files:
  - `frontend/web/src/features/hostdashboard/website/kpis/WebsiteKpiDashboardPage.js`
  - `frontend/web/src/features/hostdashboard/website/_websiteBuilder.layout.scss`
  - `docs/internal/apis/directbookingwebsite/standalone_property_site_frontend_status.md`

## [2026-04-29] Builder timing and preview-performance KPIs instrumented
Context:
The KPI dashboard already tracked draft saves, preview opens, live-preview updates, and deletion reasons, but it still could not answer two practical questions: how long it takes a host to get a usable first preview, and whether the preview surface itself performs acceptably on mobile.

Implementation:
- Added a dedicated website analytics ingest route:
  - `POST /property/website/event`
- Added explicit builder analytics events for:
  - `WEBSITE_BUILD_STARTED`
  - `WEBSITE_PREVIEW_READY`
  - `WEBSITE_BUILD_SUCCEEDED`
  - `WEBSITE_BUILD_FAILED`
- Added public preview performance telemetry event:
  - `SITE_LCP_RECORDED`
- Extended KPI aggregation so the dashboard now calculates:
  - `build_started_count`
  - `build_succeeded_count`
  - `build_failure_rate`
  - `build_success_rate`
  - `build_abandonment_rate`
  - `time_to_first_preview_p95`
  - `previewSiteLcpMobileP75`
  - `liveSiteLcpMobileP75`
- Added a dedicated `Preview / Live` surface-performance section to the KPI dashboard so preview LCP can be shown now without pretending the live published surface already exists.

Decision / Rationale:
- Server-side timestamps alone are not enough for host-perceived build timing or page-performance metrics.
- A small, explicit event-ingest path is a better contract than inferring analytics from unrelated draft timestamps.
- Preview and live performance must stay separated because they are different surfaces with different routing/runtime assumptions.

AWS / Data impact:
- No new Aurora columns or tables.
- The existing `main.standalone_site_event` table is reused.
- API Gateway must expose `POST /property/website/event` plus `OPTIONS /property/website/event`.
- `POST /property/website/event` should remain unauthenticated at the gateway because preview-surface telemetry is posted from the public preview page, while host-originated builder events still authorize inside Lambda.

Validation:
- Backend routing tests passed.
- Frontend production build passed.

Open risks / Next:
- `build_abandonment_rate` is derived from build starts that have no success/failure event after a time threshold, so it is a heuristic rather than a perfectly explicit user intent signal.
- Live-site LCP remains pending until the published public surface exists and emits the same telemetry contract.

Evidence (commit(s), file(s), docs):
- Files:
  - `backend/functions/PropertyHandler/index.js`
  - `backend/functions/PropertyHandler/controller/propertyController.js`
  - `backend/functions/PropertyHandler/data/repository/standaloneSiteEventRepository.js`
  - `backend/test/PropertyHandler/routing-unit.test.js`
  - `frontend/web/src/features/hostdashboard/website/WebsiteBuilderPage.js`
  - `frontend/web/src/features/hostdashboard/website/WebsitePublicPreviewPage.jsx`
  - `frontend/web/src/features/hostdashboard/website/kpis/WebsiteKpiDashboardPage.js`
  - `frontend/web/src/features/hostdashboard/website/analytics/websiteAnalyticsService.js`
  - `frontend/web/src/features/hostdashboard/website/kpis/services/websiteKpiService.js`
  - `docs/internal/apis/directbookingwebsite/standalone_property_site_frontend_status.md`

## [2026-04-29] Icon picker alignment and responsive panel scaling
Context:
The first icon-picker overlay worked functionally, but the selected icon trigger sat left-aligned inside the editor field and the overlay panel behaved too much like a fixed desktop sheet on smaller devices.

Implementation:
- Centered the selected trust-card icon trigger within its editable field.
- Increased the preview icon touch target slightly so the control reads more like a deliberate picker trigger.
- Switched the icon-picker dialog to tighter viewport-based sizing using `100dvh` constraints and adaptive padding.
- Added mobile-specific sizing rules so the overlay panel and icon tiles shrink more predictably on narrow screens.

Decision / Rationale:
- The icon trigger should visually read as a single centered selection control, not as left-aligned stray content.
- Overlay sizing must respect smaller screens without forcing desktop spacing into a constrained viewport.

AWS / Data impact:
- No Aurora schema change.
- No API Gateway change.
- No Lambda change.
- Frontend-only styling adjustment on top of the existing icon-picker flow.

Validation:
- Frontend production build passed.

Open risks / Next:
- If the icon registry grows significantly, consider grouping or lightweight filtering before increasing tile density further.

Evidence (commit(s), file(s), docs):
- Files:
  - `frontend/web/src/features/hostdashboard/website/WebsiteEditorPage.module.scss`
  - `docs/internal/apis/directbookingwebsite/standalone_property_site_frontend_status.md`

## [2026-04-29] Icon picker deduplicated by glyph and converted to viewport-safe rail
Context:
The first icon picker still surfaced repeated icons because it iterated over amenity records rather than unique icon glyphs, and the small-screen overlay could clip awkwardly because the scroll behavior was tied directly to the grid instead of a dedicated viewport rail.

Implementation:
- Deduplicated icon picker options by underlying Domits icon component rather than by amenity id.
- Kept all amenity ids valid for rendering, but exposed only one representative option per unique icon glyph in the editor picker.
- Split the picker into a horizontal scroll viewport with an inner max-content grid so narrow devices can scroll the icon set cleanly.
- Allowed the dialog itself to scroll within viewport-safe `100dvh` bounds instead of behaving like a rigid desktop panel.

Decision / Rationale:
- Hosts should choose from unique visuals, not from a noisy list of duplicate amenity records that happen to share the same icon.
- A dedicated scroll viewport is the more reliable pattern for responsive overlay behavior than making the grid container itself shoulder both layout and scrolling.

AWS / Data impact:
- No Aurora schema change.
- No API Gateway change.
- No Lambda change.
- Frontend-only refinement on top of the existing icon-picker override path.

Validation:
- Frontend production build passed.

Open risks / Next:
- If product later wants semantic groupings in the icon picker, grouping should still happen on top of the deduplicated icon catalogue rather than reintroducing repeated glyphs.

Evidence (commit(s), file(s), docs):
- Files:
  - `frontend/web/src/features/hostdashboard/website/rendering/amenityIconRegistry.js`
  - `frontend/web/src/features/hostdashboard/website/WebsiteEditorPage.js`
  - `frontend/web/src/features/hostdashboard/website/WebsiteEditorPage.module.scss`
  - `docs/internal/apis/directbookingwebsite/standalone_property_site_frontend_status.md`

## [2026-05-01] Standalone site/domain foundation for real publication lifecycle
Context:
The standalone website implementation still relied on `standalone_site_draft` plus a `draftId` preview route. That was acceptable for internal previewing, but it was not a real public site lifecycle and it had no separate domain model.

Implementation:
- Added Aurora migration and ORM models for:
  - `main.standalone_site`
  - `main.standalone_site_domain`
- Added backend repositories:
  - `StandaloneSiteRepository`
  - `StandaloneSiteDomainRepository`
- Added PropertyHandler routes:
  - `GET /property/website/site`
  - `POST /property/website/site/publish`
  - `POST /property/website/site/unpublish`
- Added editor integration so the host can:
  - inspect standalone site state
  - inspect fallback-domain state
  - publish the current approved live-preview snapshot into a standalone site record
  - unpublish that standalone site record again
- Kept the existing draft and preview flow intact:
  - `Save changes` still affects only the working draft
  - `Update live preview` still updates the shared preview snapshot
  - `Publish fallback site` now consumes that approved preview snapshot rather than raw unsaved draft edits

Decision / Rationale:
- Draft state, site lifecycle state, and domain lifecycle state are separate concerns and must not be stored in one record.
- Publishing is blocked while preview-sync is pending, because allowing stale public publishes would be operator-hostile and brittle.
- Fallback-domain state is intentionally independent from site publication state, so a site can be `PUBLISHED` while routing is still `PENDING`.

AWS / Data impact:
- New Aurora tables required in schema `main`:
  - `standalone_site`
  - `standalone_site_domain`
- New API Gateway routes required:
  - `GET /property/website/site`
  - `POST /property/website/site/publish`
  - `POST /property/website/site/unpublish`
  - corresponding `OPTIONS` routes if browser preflight is needed in the deployed environment
- No existing standalone draft columns were removed or repurposed.

Validation:
- Backend routing unit test passed.
- Frontend production build passed.

Open risks / Next:
- Fallback domains are now tracked, but host-based public resolution is not implemented yet.
- The public site still resolves through `draftId` preview, so fallback/custom domains are not reachable until the public resolver/runtime phase is added.
- Custom-domain verification, certificate handling, and host-header routing remain later phases.

Evidence (commit(s), file(s), docs):
- Files:
  - `backend/ORM/migrations/20260501_standalone_site_foundation.js`
  - `backend/ORM/models/Standalone_Site.js`
  - `backend/ORM/models/Standalone_Site_Domain.js`
  - `backend/functions/PropertyHandler/data/repository/standaloneSiteRepository.js`
  - `backend/functions/PropertyHandler/data/repository/standaloneSiteDomainRepository.js`
  - `backend/functions/PropertyHandler/controller/propertyController.js`
  - `backend/functions/PropertyHandler/index.js`
  - `backend/test/PropertyHandler/routing-unit.test.js`
  - `frontend/web/src/features/hostdashboard/website/services/websiteSiteService.js`
  - `frontend/web/src/features/hostdashboard/website/WebsiteEditorPage.js`
  - `frontend/web/src/features/hostdashboard/website/WebsiteEditorPage.module.scss`
  - `docs/internal/apis/directbookingwebsite/standalone_property_site_frontend_status.md`

## [2026-05-01] Published-site resolver and runtime on top of standalone site/domain foundation
Context:
Phase 1 separated draft state from site/domain state, but the public runtime still depended on the `draftId` preview route. That meant fallback domains were tracked but not actually usable as the published-site resolution model.

Implementation:
- Added public standalone-site routes in PropertyHandler:
  - `GET /property/website/public/resolve`
  - `GET /property/website/public/render`
- Added repository lookups for:
  - `StandaloneSiteRepository.getSiteById(...)`
  - `StandaloneSiteDomainRepository.getDomainByName(...)`
- Added a published-site runtime page:
  - `frontend/web/src/features/hostdashboard/website/WebsitePublicSitePage.jsx`
- Added public runtime fetch helpers:
  - `websitePublicSiteService.js`
- Added same-origin debug routing:
  - `/website-live/:domain`
  - optional `?siteId=` support so published-site rendering can be exercised before real fallback-domain DNS is active
- Added live-surface LCP telemetry from the published-site runtime through the existing `SITE_LCP_RECORDED` event path.
- Added an editor link into the published-site test route so hosts can open the currently published site state without leaving the workspace guessing which URL to construct.

Decision / Rationale:
- Public live rendering now uses the published snapshot stored in `standalone_site` rather than the draft preview path.
- Real host-based resolution still validates published-site reachability through domain status.
- Internal debug rendering is intentionally separated from real domain activation so acceptance testing does not depend on DNS cutover timing.
- The public API accepts the target domain explicitly from the frontend because browser API calls go to the API host, not the standalone site host. Relying on the API request `Host` header alone would be wrong in the current client-rendered architecture.

AWS / Data impact:
- New API Gateway routes required:
  - `GET /property/website/public/resolve`
  - `GET /property/website/public/render`
  - corresponding `OPTIONS` routes if browser preflight is needed in the deployed environment
- No new Aurora tables or columns were required beyond the Phase 1 site/domain foundation.
- Existing KPI/event storage is reused; live LCP telemetry now becomes real once published-site traffic exists.

Validation:
- Backend routing unit test passed.
- Frontend production build passed.

Open risks / Next:
- Fallback-domain DNS and public host routing still need the actual infrastructure cutover to make the live site reachable on its real hostname.
- Custom-domain verification and activation remain a later phase.
- The internal `/website-live/:domain?siteId=...` route is a controlled debug path, not the final public hostname strategy.

Evidence (commit(s), file(s), docs):
- Files:
  - `backend/functions/PropertyHandler/data/repository/standaloneSiteRepository.js`
  - `backend/functions/PropertyHandler/data/repository/standaloneSiteDomainRepository.js`
  - `backend/functions/PropertyHandler/controller/propertyController.js`
  - `backend/functions/PropertyHandler/index.js`
  - `backend/test/PropertyHandler/routing-unit.test.js`
  - `frontend/web/src/App.js`
  - `frontend/web/src/features/hostdashboard/website/WebsitePublicSitePage.jsx`
  - `frontend/web/src/features/hostdashboard/website/services/websitePublicSiteService.js`
  - `frontend/web/src/features/hostdashboard/website/analytics/websiteAnalyticsService.js`
  - `frontend/web/src/features/hostdashboard/website/WebsiteEditorPage.js`
  - `frontend/web/src/features/hostdashboard/website/WebsiteEditorPage.module.scss`
  - `docs/internal/apis/directbookingwebsite/standalone_property_site_frontend_status.md`

## [2026-05-04] KPI performance metrics segmented by mobile, tablet, and desktop
Context:
The standalone website KPI dashboard already exposed preview/live performance as a separate category, but the actual telemetry and aggregation were still biased toward mobile-only LCP. That was too narrow to support useful cross-device analysis.

Implementation:
- Expanded preview telemetry so `SITE_LCP_RECORDED` events now classify viewport as:
  - `mobile`
  - `tablet`
  - `desktop`
- Extended backend KPI aggregation to keep separate p75 and sample counts for each:
  - preview mobile/tablet/desktop
  - live mobile/tablet/desktop
- Updated the KPI dashboard performance view to use nested tabs:
  - surface: `Preview` / `Live`
  - viewport: `Mobile` / `Tablet` / `Desktop`
- Deliberately did not add an `All` bucket, because mixing heterogeneous viewport performance into one p75 would make the metric less honest and harder to interpret.

Decision / Rationale:
- Device class materially affects LCP. A single mixed number looks neat but hides the very variance the KPI is supposed to surface.
- The clean model is segmentation first, aggregation second.

AWS / Data impact:
- No new Aurora table or column change.
- No new API Gateway route.
- Existing `/property/website/event` ingestion path now accepts `tablet` in addition to `mobile` and `desktop`.

Validation:
- Frontend production build passed:
  - `react-scripts build`

Open risks / Next:
- Existing historical preview telemetry remains mobile-heavy until new tablet/desktop visits are recorded.
- Live-site viewport metrics will continue to show pending/no data until the real published live-site surface emits telemetry.

Evidence (commit(s), file(s), docs):
- Files:
  - `frontend/web/src/features/hostdashboard/website/analytics/websiteAnalyticsEventTypes.js`
  - `frontend/web/src/features/hostdashboard/website/analytics/websitePreviewAnalytics.js`
  - `frontend/web/src/features/hostdashboard/website/WebsitePublicPreviewPage.jsx`
  - `frontend/web/src/features/hostdashboard/website/kpis/websiteKpiFields.js`
  - `frontend/web/src/features/hostdashboard/website/kpis/websiteKpiConfig.js`
  - `frontend/web/src/features/hostdashboard/website/kpis/WebsiteKpiDashboardPage.js`
  - `frontend/web/src/features/hostdashboard/website/_websiteBuilder.layout.scss`
  - `backend/functions/PropertyHandler/controller/propertyController.js`
  - `backend/functions/PropertyHandler/data/repository/standaloneSiteEventRepository.js`
