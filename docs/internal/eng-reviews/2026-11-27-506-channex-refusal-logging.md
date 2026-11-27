# fix(channex): log Channex refusals and answer "contact support" on a 401/403 (#506)

Pull request: #4075
Issue: #506
Base: `acceptance`
Reviewed: each commit on its staged diff before it was made (27 Nov)
Result: no blocking findings; every non-blocking finding decided below

The live check of 26 Nov (record `2026-11-25-506-distribution-routes.md`) needed database queries and test calls to Channex to find why a turn-on was refused and why a listing's channels were unknown. These paths returned without a log. This PR closes two of the follow-ups from that check.

## Commits

| Commit | What |
|---|---|
| `ea3ff9e74` | `readChannels` throws with the reason (`MISSING_API_KEY` or Channex's code); the existing catch logs `CHANNEX_DISTRIBUTION_CHANNELS_UNAVAILABLE` and still shows the channels as unknown |
| `7a46af372` | A refused Channex create returns its HTTP status; `findOrCreate` logs `CHANNEX_PROVISIONING_CREATE_FAILED` with the object, the listing, status, code, message and field messages |
| `354950103` | A 401 or 403 on a create answers 503 `DISTRIBUTION_NOT_CONFIGURED` ("contact support") instead of 502 "check its address, guests and price" |
| `9770e70b9` | Style: long lines in the new tests wrapped (no behaviour change) |

## Flow

```
turn-on ─▶ findOrCreate(object, listing)
              │ create fails
              ▼
           log CHANNEX_PROVISIONING_CREATE_FAILED
              │
              ├─ 401 / 403 ──────────▶ 503 DISTRIBUTION_NOT_CONFIGURED   (key may not do this)
              ├─ timeout / 5xx / 429 ▶ 503 DISTRIBUTION_TRY_AGAIN         (unchanged)
              └─ other 4xx ──────────▶ 502 DISTRIBUTION_CHANNEX_REFUSED   (unchanged)

refresh / list ─▶ readChannels ─ no key or Channex error ─▶ throw ─▶ log ─▶ channelsUnavailable (unchanged)
```

## Findings and decisions

| Severity | Where | Finding | Decision |
|---|---|---|---|
| Checked | `channexDistributionListingsService.js` `readChannels` | It now throws instead of returning null | Its only caller, `readChannelsOrNull`, catches and returns null, so the answer to the host is unchanged |
| Checked | `providerClient.js` `listChannels` | The log must never be empty | Every failure path sets an `errorCode` |
| Checked | `channexProvisioningService.js` `findOrCreate` | The log must not hold secrets | It holds Channex's status, code, message and field messages; never the request body or the key |
| Checked | Contract, design note section 6 | A new answer for 401/403 would break the frontend | `DISTRIBUTION_NOT_CONFIGURED` is already in the turn-on contract and in Rakib's error table |
| Checked | Partial setup | A 403 on the room type or rate plan after the property exists | The claim stays `PROVISIONING` and the next attempt resumes from the saved property id, as for every refusal |
| P3 (6/10) | `findOrCreate` log | A 422's field messages went to the browser but not to the log | Fixed in `7a46af372`: `validationDetails` in the log, with a test |
| P3 (9/10) | New test lines | Three new lines were over the 120-character limit | Fixed in a separate style commit `9770e70b9`; older long lines in the same file are left alone |

## Failure modes

| Path | Failure | Test | Handling | Host sees |
|---|---|---|---|---|
| Turn-on | Key restricted (403) | Yes | Logged, 503 `DISTRIBUTION_NOT_CONFIGURED` | "Distribution is not available right now. Please contact support." |
| Turn-on | Payload refused (422) | Yes | Logged with field messages, 502 `DISTRIBUTION_CHANNEX_REFUSED` | "Check its address, guests and price, or contact support." |
| Refresh or list | Key missing or Channex refuses | Yes | Logged with the reason, `channelsUnavailable: true` | Channels as unknown |

## Tests

Full backend suite before every commit: 28 failed tests in 7 suites, the same as the known baseline on acceptance (database and infrastructure suites), no new failures.

## Not in scope

- The new Channex API key with Properties Access: All: configuration, after Friday's Booking.com test (design note D8).
- Emerald Estate's Channex property id: a data check, not code.

## What already exists

- `readChannelsOrNull` and its log event, reused for the new reasons.
- `notConfigured()` and its contract entry, reused for 401/403.
