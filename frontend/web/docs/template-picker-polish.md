# Template picker polish

Step 2 offers Essentials (`panorama-landing`) and disabled, coming-soon Elite (`trust-signals`).
Display names, descriptions, selection labels and availability copy use en/nl/de/es translations.
The shared catalog also supplies website-card names, editor badges and preview-loading names.

## Compatibility and cleanup

`websiteDraftService.js` sends `templateKey`; `Standalone_Site_Draft.template_key` stores it.
Publishing copies `draft.templateKey` into `Standalone_Site.template_key` alongside published snapshots.
`WebsitePublicSitePage.jsx` reads that key and resolves it through `rendering/templateRegistry.js`.
All ten catalog IDs and `DEFAULT_WEBSITE_TEMPLATE_ID` match `origin/acceptance`; no migration is needed.
Persistence services, backend code, editor defaults and renderer registry are unchanged.

Experience Journey and six later coming-soon cards are hidden; their dedicated silhouettes, cursor
configurations and unused CSS are removed. Legacy lookup entries and Experience Journey rendering
remain for saved records. No dedicated images existed; shared assets and the previously hidden
Feature Stack are retained. Historical internal documents are outside this frontend change.

## Verification and engineering review

`npm test -- --watchAll=false --runInBand --watchman=false`: 86 suites / 753 tests passed,
with 7 suites / 47 tests already skipped. A temporary Node preload blocked network connections.
Eleven new checks cover four-language picker rendering, two cards, disabled Elite, current pick,
localized descriptions, fallback language, unchanged renderer lookup and mocked draft-save keys.
`npm run build` compiled with a temporary empty `aws-exports.js`; this checkout lacks its real
Amplify configuration. The temporary config and generated bundle were removed after verification.
Engineering review and an independent review found no blockers. Existing persistence and rendering
flows are reused; no new requests are introduced. Backend changes and broader localization are deferred.

Display copy → picker → unchanged `templateKey` → draft → published snapshot → existing renderer.
