# Standalone Property Site - Implementation Log (Append-Only)

## Purpose
This file is the chronological implementation log for the standalone website feature.  
Use it to trace what was implemented, when it was implemented, why decisions were made, and what changed in AWS/data flow.

## Rules
- Append-only: do not delete old entries.
- Do not rewrite past decisions; add a new corrective entry if direction changes.
- Every entry should include date, scope, key files, validation, and rollout impact.
- Use absolute dates (`YYYY-MM-DD`).

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

