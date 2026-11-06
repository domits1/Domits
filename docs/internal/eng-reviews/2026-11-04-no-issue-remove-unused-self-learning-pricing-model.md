# Remove unused self-learning pricing model

Pull request: #3788  
Related issues: #1399 (Cleanup), #1398 (Technical Debt)  
Reviewed against: `acceptance` at `7a829368981edef68a1987d00c2c27f3c75b8798`

## Findings

| Area | Evidence | Decision |
|---|---|---|
| Pricing-model hook | Repository-wide searches for `useSelfLearningPricingModel`, `SelfLearningPricing`, `predictPrice(`, and `integrateWithUI(` found no consumer. The only source hit is the hook file itself. | Remove the orphaned hook. |
| TensorFlow usage | Searches for `tensorflow`, `tfjs`, and `@tensorflow` found no frontend source/config usage outside the orphaned hook and its dependency declaration. | Remove `@tensorflow/tfjs` from the frontend dependencies. |
| Lockfile | The frontend uses lockfile version 3. Removing the root TensorFlow dependency makes 17 package entries unreachable from all remaining root dependencies. | Remove those 17 entries and retain packages still reachable through other dependencies. |

## Changes

- Delete `frontend/web/src/hooks/useSelfLearningPricingModel.js`.
- Remove `@tensorflow/tfjs` from `frontend/web/package.json`.
- Remove the matching root dependency and 17 now-unreachable package entries from `frontend/web/package-lock.json`.

## Behavioral guarantee

No imported consumer of the hook was found in the repository. The current calendar, PriceLabs and pricing features do not reference this hook. This deletion does not change active pricing logic, API calls, data, or user-visible behavior.

The root `node_modules/node-fetch` lock entry remains reachable through other dependencies; only TensorFlow-exclusive nested package entries are removed.

## Risk and validation

- A dynamic reference generated outside the repository could evade static search; no repository reference or configuration usage was found.
- The lockfile root dependency metadata is updated together with `package.json`.
- The lockfile graph was checked before and after removal. Only packages that became unreachable specifically because TensorFlow was removed were pruned.
- Local npm install, tests and build were not run in this review. CI must validate the updated install, test and build workflows before merge.

## Out of scope

- No active pricing, calendar, booking, or PriceLabs implementation is changed.
- No other frontend dependencies are changed.
- No broader host-dashboard or calendar cleanup is included.
