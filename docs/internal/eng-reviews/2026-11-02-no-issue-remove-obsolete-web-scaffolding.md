# Engineering review: remove obsolete web scaffolding

## Target
Deletion-only cleanup on `mounir-remove-obsolete-web-scaffolding`, based on `acceptance` at `8248537b8dd9b77c7214589c0dcc0b0b7ba25fbd`.

## Scope and decision
Remove only files that are explicitly isolated, have no incoming code references, and are not part of a deployment or local environment contract.

Deleted:
- `frontend/web/src/dotenv.js`: the only occurrence of this path is its own self-import; no application import was found.
- `frontend/web/src/outdated/checkout/`: three old checkout/test components. Repository search found no imports or references. They use old test endpoints and hardcoded demo checkout data.
- `frontend/web/src/outdated/ui-components/`: 22 Amplify-generated backup files. No imports or references to this directory were found; the current generated components remain under `frontend/web/src/ui-components/`.
- `docs/internal/qa/cypress_automated_testing.md`: standalone guide with no incoming references. It describes a `develop` branch workflow and a Vite setup that do not match the current web app's Create React App setup.

## What already exists
- Current Stripe checkout and payment components remain under the active booking-engine and payment features.
- Current Amplify-generated UI components remain under `frontend/web/src/ui-components/`.
- The current Cypress setup and specs remain untouched.
- The backend Lambda event scaffold and all backend files remain untouched.

## Dependency and architecture review
```text
Active web application
  ├── booking engine / current Stripe flows ── retained
  ├── src/ui-components/ ───────────────────── retained
  └── current Cypress specs/config ─────────── retained

Unreferenced legacy files
  ├── src/dotenv.js ────────────────────────── removed
  ├── src/outdated/checkout/ ───────────────── removed
  ├── src/outdated/ui-components/ ──────────── removed
  └── obsolete Cypress guide ───────────────── removed
```

No runtime code imports the deleted files, and no route or build configuration points to them. The old UI component backup is not the active Amplify Studio output directory.

## Failure modes and verification
- A hidden dynamic import or external manual link could exist outside repository search. No such reference was found in tracked source or docs; reviewers should check this assumption.
- The current UI component directory and Stripe payment implementation were left in place, so no replacement code or runtime behavior is introduced.
- No local build or test suite was run in this environment. CI must pass before merge.

## Not in scope
- Root `package.json`: its purpose is unclear even though it is not the documented workspace root; dependency-resolution implications need a separate review.
- Any tracked or local `.env` files: no tracked environment files were found at the common paths, and local ignored files cannot be assessed from repository contents.
- Backend test events, including the empty `sometestfunction/get.js`: the corresponding Lambda directory still exists.
- AWS onboarding documents: they contain outdated credential instructions but are referenced by other onboarding material; update them rather than deleting them.
- Active `frontend/web/src/ui-components/`, GraphQL operations, and Amplify configuration: these have active consumers or generated-configuration responsibilities.

## Conclusion
This is a deletion-only repository cleanup. It is not claimed as a runtime performance improvement; the removed files were not imported into the active application bundle.
