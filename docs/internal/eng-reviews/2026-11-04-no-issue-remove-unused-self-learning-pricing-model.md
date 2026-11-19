# Remove unused self-learning pricing model

Pull request: #3788  
Related issues: #1399 (Cleanup), #1398 (Technical Debt)  
Initial review against: `acceptance` at `7a829368981edef68a1987d00c2c27f3c75b8798`  
Lockfile refreshed against: `acceptance` at `ca848e8bb71780709a6871fc2049c469de81cfeb`

## Findings

| Area | Evidence | Decision |
|---|---|---|
| Pricing-model hook | Repository-wide searches for `useSelfLearningPricingModel`, `SelfLearningPricing`, `predictPrice(`, and `integrateWithUI(` found no consumer. The only source hit is the hook file itself. | Remove the orphaned hook. |
| TensorFlow usage | Searches for `tensorflow`, `tfjs`, and `@tensorflow` found no frontend source/config usage outside the orphaned hook and its dependency declaration. | Remove `@tensorflow/tfjs` from the frontend dependencies. |
| Lockfile | The frontend uses lockfile version 3. On the refreshed `acceptance` dependency graph, removing the root TensorFlow dependency makes 14 package entries unreachable. `@types/node-fetch` is still required by `@aws-amplify/core`, so it must remain. | Remove the 14 TensorFlow-only entries and preserve shared packages. |

## Changes

- Delete `frontend/web/src/hooks/useSelfLearningPricingModel.js`.
- Remove `@tensorflow/tfjs` from `frontend/web/package.json`.
- Remove the matching root dependency and 14 TensorFlow-only package entries from `frontend/web/package-lock.json`.

## Behavioral guarantee

No imported consumer of the hook was found in the repository. The current calendar, PriceLabs and pricing features do not reference this hook. This deletion does not change active pricing logic, API calls, data, or user-visible behavior.

The root `node_modules/node-fetch` and `node_modules/@types/node-fetch` entries remain reachable through other dependencies, including `isomorphic-unfetch` and `@aws-amplify/core`. Only TensorFlow-exclusive package entries are removed.

## Risk and validation

- A dynamic reference generated outside the repository could evade static search; no repository reference or configuration usage was found.
- The lockfile root dependency metadata is updated together with `package.json`.
- The lockfile package references were checked after removal. No remaining package references point to the 14 removed TensorFlow-only entries.
- Local npm install, tests and build were not run in this review. CI must validate the updated install, test and build workflows before merge.

## Out of scope

- No active pricing, calendar, booking, or PriceLabs implementation is changed.
- No other frontend dependencies are changed.
- No broader host-dashboard or calendar cleanup is included.
