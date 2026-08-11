# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commits

Commit at every green step, not at every green iteration. A step is green when the tests that describe it pass.

The rhythm is: failing test, implementation, tests pass, commit. The commit happens before the next failing test is written.

- Run the whole test suite before every commit, not only the suite for the layer just edited. A change is green when every suite is green.
- Never commit a failing test. "I did not know it was red" is not an exception, it is the failure. Not looking is how red gets committed.
- A behaviour change that invalidates a higher level test invalidates it now, not later. Update that test in the same commit as the behaviour.
- Test and implementation for the same behaviour go in one commit. They are one change.
- Refactoring is committed separately from behaviour, so a review can read it as a no-behaviour-change diff.
- When one change ripples across layers and cannot be green in isolation, commit those layers together as one coherent change rather than leaving the repository red.
- Do not batch a finished iteration into a single end-of-iteration commit. That hides the order the design was built in and leaves nothing reviewable until everything lands.
- The end of an iteration is a documentation commit and a review pass, not the moment the code first appears in the history.
- Use conventional commits.

## Repository layout

Three independent npm workspaces. Each has its own `package.json` and lockfile. Run every command from inside the correct directory.

```
Directory              Stack                       Purpose
---------              -----                       -------
backend/               Node.js ESM, AWS Lambda     One directory per Lambda function
backend/ORM/           TypeORM, Aurora DSQL        Shared `database` package (file: dependency)
frontend/web/          React 18, react-scripts     Web application
frontend/app/Domits/   React Native                Mobile application (iOS + Android)
docs/internal/         Markdown                    Standards, API docs, onboarding
```

The root `package.json` is not a workspace root. Ignore it for builds.

## Commands

Backend (`cd backend`):

```
Command                                          Purpose
-------                                          -------
npm i                                            Install (development)
npm ci                                           Install (production/CI build)
npm test                                         Run all Jest tests
npm test -- test/PropertyHandler                 Run one directory of tests
npm test -- -t "returns 404"                     Run tests matching a name
npm run createLambda                             Scaffold function + create AWS API and Lambda
npm run createLambda false                       Scaffold folders only, for an existing Lambda
node events/<function>/get.js                    Invoke a handler end to end, locally
```

Web (`cd frontend/web`):

```
Command                                          Purpose
-------                                          -------
npm install                                      Install
npm start                                        Dev server on http://localhost:3000
FAST_REFRESH=false npm start                     Dev server on macOS
npm test                                         Jest (watch mode)
npm test -- --watchAll=false <pattern>           Run one test file, no watch
npm run build                                    Production build (ESLint plugin disabled)
npm run build-sass                               Compile src/styles/sass/app.scss to src/index.css
npx cypress open                                 Cypress runner
```

Mobile (`cd frontend/app/Domits`): `npm start`, `npm run android`, `npm run ios`, `npm test`, `npm run lint`.

Local web setup needs AWS Amplify credentials pulled into `frontend/web/src/aws-exports.js`. See `docs/internal/onboarding/running Domits locally.md`, or the SSO variant if the normal flow fails. Backend work needs the AWS CLI configured with region `eu-north-1`.

## Backend architecture

Each directory under `backend/functions/<Name>/` is one deployed Lambda. Strict layered architecture. Read `docs/internal/onboarding/backend_development_flow.md` before you add a function.

```
Layer         Directory      Responsibility                                    May call
-----         ---------      --------------                                    --------
Routing       index.js       Route the event to a controller method            controller
Controller    controller/    Parse the request, authorize                      business
Business      business/      Validate data, models, services, orchestration    data
Data          data/          Databases, other APIs, external sources           nothing
Util          util/          Mapping, constants, exceptions, HTTP headers      n/a
```

A layer may only call the layer below it. A layer only returns to the layer above it. The controller must never touch the data layer.

Key rules:

- Every function directory needs a `metadata.json` with a `functionName` that matches a real AWS Lambda. CI fails the PR if a changed function has no `metadata.json`, or if the named Lambda does not exist in AWS.
- Add a `.deployment-disabled` file in the function directory to skip AWS validation and deployment.
- Install every backend dependency in `backend/package.json`. Running `npm install` in a function subdirectory breaks the AWS build.
- `backend/functions/.shared/` holds cross-function helpers. Jest maps `../.shared/...` imports up to four levels deep.
- Database access uses the local `database` package: `import Database from "database"`, `import {User_Table} from "database/models/User_Table"`, then `const client = await Database.getInstance()`. TypeORM query syntax. See `docs/internal/tools/orm/usage.md`.
- Tests live in `backend/test/<FunctionName>/`, mirroring `backend/functions/`. Events for manual runs live in `backend/events/<FunctionName>/`.
- Only senior developers and DevOps engineers edit `backend/CD/`.
- A merged and deployed Lambda is not yet a usable endpoint. New API surfaces still need API Gateway resources, methods, CORS, and an API deployment.

## Frontend architecture

`frontend/web/src/features/<feature>/` is the default home for new code. A feature owns its own `components/`, `context/`, `hooks/`, `pages/`, `services/`, `store/`, `styles/`, `tests/`, `utils/`, and `views/`. Only put code in the top-level `src/components/`, `src/services/`, `src/hooks/`, or `src/utils/` when it is genuinely global.

`src/outdated/` and `features/hostdashboard/hostcalendar/` hold legacy code. Do not extend them.

`frontend/app/Domits/src/` mirrors the web `src/` structure.

Styling uses SASS/SCSS. Global styles live in `src/styles/sass/`.

## Branch and PR workflow

- Branch from `acceptance`. Never commit directly on `acceptance`.
- `acceptance` is the integration target for all normal work. `main` is a release branch only.
- Before review: `git pull origin acceptance`, resolve conflicts in your branch.
- Conventional-commit-style PR title. Fill in `PULL_REQUEST_TEMPLATE.md` completely.
- Merge gate: 2 approvals, all comments resolved, CI green.
- If a backend deploy pipeline fails after merge, revert the merge, then fix.

CI triggers by path:

```
Workflow                 Trigger                                    Runs
--------                 -------                                    ----
test.yml                 PR to acceptance/main, backend/**          Backend Jest, Lambda existence check
deploy.yml               Push to acceptance/main, backend/**        Deploys changed Lambdas
webapp-build-test.yml    Push/PR to acceptance                      Web Jest + build
ci.yml                   Push to acceptance/main, frontend/**       Web Jest coverage + Cypress
```

`test/PropertyHandler/end-to-end.test.js` is excluded in CI because it needs a live database.

## Testing rules

From `docs/internal/onboarding/testing_guidelines.md` and `docs/internal/context/domits_vault/01_Foundation/Testing_Guidance.md`:

- Test business logic, branching, validation rules, and reusable code. Skip dedicated tests for trivial plumbing and for behavior a stronger test already covers.
- One responsibility per test. Explicit assertions. Isolate external dependencies.
- Prefer fewer strong tests over many vague tests. A test must make the code safer, not only make the diff larger.
- A test that passes when the behavior is broken is a defect.
- The backend has `fast-check` available for property-based tests.

## Code conventions

From `docs/internal/standards/code_conventions.md` and `docs/internal/context/domits_vault/01_Foundation/Clean_Code_Standards.md`:

```
Item                        Convention
----                        ----------
Folders                     lowercase
React component files       PascalCase
HTML/CSS classes and files  kebab-case
Methods and variables       camelCase
Constants                   UPPERCASE_WITH_UNDERSCORES
```

- Prefer explicit simple solutions over clever abstractions. Remove dead code and commented-out logic.
- Comment why, not what.
- Handle failure paths intentionally. Do not swallow errors.
- Validate inputs and data consistency before any persistence side effect.
- Prefer responsive relationships (`clamp(...)`, container size, shared tokens) over hardcoded pixel values.

SonarCloud scans `frontend/web/src`, `frontend/app/Domits/src`, and `backend`. Recurring Sonar findings signal structural drift, not lint noise. Common patterns to design for, from `docs/internal/context/domits_vault/01_Foundation/Sonar_Conventions.md`:

- Extract a shared helper when normalization, mapping, or formatting logic appears more than once.
- Keep page-level files orchestration-only.
- Avoid nested ternaries and layered negated conditions. Use named booleans.
- Watch React prop spreading. Do not let shared props override `className`, `style`, or accessibility attributes.
- Do not abstract only to silence a one-off warning if the result is less clear.

Prettier config lives in `.prettierrc`: 2-space tabs, 120 print width, semicolons, double quotes, `bracketSameLine: true`.

## Documentation map

`docs/internal/context/domits_vault/01_Foundation/` holds the distilled, current versions of the workflow and standards notes. Start there. `docs/internal/apis/` documents each API module. `docs/internal/onboarding/` holds the long-form setup guides.
