# PriceLabs Integration API

## Description

The PriceLabs Integration Lambda handles all communication between Domits and the PriceLabs dynamic pricing platform. It pushes listings, calendar data and reservations to PriceLabs, and receives price recommendations via webhooks. Hosts must explicitly approve PriceLabs suggestions before they are applied to their calendar.

## Metadata

| Field           | Value                                                               |
| --------------- | ------------------------------------------------------------------- |
| Lambda Function | `PriceLabs-Integration`                                             |
| Region          | `eu-north-1`                                                        |
| API Gateway     | `https://wq2aughzk2.execute-api.eu-north-1.amazonaws.com/default/` |
| PriceLabs API   | `https://api.pricelabs.co/v2/integration/api`                       |
| Related table   | `property_calendar_override`, `pricelabs_connection`               |
| Status          | Active (pre-certification)                                          |

---

## Price Suggestion Flow

```
PriceLabs → POST /webhook/sync
              ↓
  applyPriceRecommendation()
  writes: pricelabs_price (suggestion only)
  does NOT touch: nightly_price
              ↓
  GET /calendar/overrides returns both fields:
    nightlyPrice   = host-set price (shown on calendar)
    priceLabsPrice = PriceLabs suggestion (shown in sidebar card)
              ↓
  Host selects a date → sees suggestion in Dynamic Pricing card
              ↓
  Host clicks "Apply price" or "Ignore"
              ↓
  Apply:  PATCH /calendar/overrides → nightly_price = priceLabsPrice, pricelabs_ignored = false
  Ignore: PATCH /calendar/overrides → pricelabs_ignored = true (suggestion hidden, host price stays)
  Undo:   PATCH /calendar/overrides → pricelabs_ignored = false (+ nightly_price = null for applied dates)
              ↓
  State detection on every GET (parseOverrideResponse):
    applied  = nightly_price === pricelabs_price && !ignored   → green "✓ PL" badge
    ignored  = pricelabs_ignored === true                      → grey "✗ PL" badge
    suggested = pricelabs_price set, not applied, not ignored  → teal "PL €x" badge
```

The key design decision: **PriceLabs prices are never auto-applied.** They are stored separately as `pricelabs_price` and require explicit host approval. "Applied" is a heuristic (nightly equals suggestion), not a separate column — a host manually setting the identical price shows as applied.

---

## Endpoints

### Authenticated (requires Cognito Bearer token)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/connect` | Connect PriceLabs account, push initial listings/calendar/reservations |
| DELETE | `/disconnect` | Deactivate PriceLabs connection |
| GET | `/status` | Get connection status and last sync timestamps |
| POST | `/push/listings` | Manually push property listings to PriceLabs |
| POST | `/push/calendar` | Manually push 730-day calendar to PriceLabs |
| POST | `/push/reservations` | Manually push booking data to PriceLabs |

### Webhooks (called by PriceLabs, no auth token)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/webhook/sync` | Receive price recommendations from PriceLabs |
| POST | `/webhook/calendar-trigger` | PriceLabs requests fresh calendar data |
| POST | `/webhook/hook` | Error / status notifications from PriceLabs |

### Internal (Lambda-to-Lambda)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/internal/sync-booking` | Triggered by PropertyHandler on booking changes |

---

## Webhook Signature Verification

PriceLabs signs webhooks with HMAC-SHA256. The signature uses three headers:

```
X-PL-SIGNED-HEADERS = v1.<sha256(v1:{source}:{timestamp}:{requestId}, integrationToken)>
X-PL-SIGNED-BODY    = sha256(signedHeaders + rawBody, integrationToken)
```

**Development mode note:** During development and pre-certification, PriceLabs does NOT send signature headers. The Lambda skips verification when `X-PL-SIGNED-HEADERS` and `X-PL-SIGNED-BODY` are absent. Verification is enforced once headers are present (production/certified mode).

---

## Database Schema

### `pricelabs_connection`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `host_id` | VARCHAR | Cognito sub of the host |
| `pricelabs_email` | VARCHAR | PriceLabs account email |
| `is_active` | BOOLEAN | Connection enabled |
| `connected_at` | BIGINT | Unix timestamp of connection |
| `last_listings_sync_at` | BIGINT | Last listing push |
| `last_calendar_sync_at` | BIGINT | Last calendar push |
| `last_reservations_sync_at` | BIGINT | Last reservations push |
| `last_sync_status` | VARCHAR | `connected`, `synced`, `error`, `disconnected` |
| `last_sync_error` | TEXT | Last error message |

### `property_calendar_override` (relevant columns)

| Column | Type | Description |
|--------|------|-------------|
| `nightly_price` | INT | **Host-set price** — shown on calendar, requires explicit host action |
| `pricelabs_price` | INT | **PriceLabs suggestion** — set by webhook, shown as suggestion in sidebar |
| `pricelabs_ignored` | BOOLEAN | Host ignored the suggestion (migration `20260609`, nullable — DSQL does not allow `NOT NULL DEFAULT` on `ADD COLUMN`) |
| `min_stay` | INT | Updated by PriceLabs recommendations |
| `closed_to_arrival` | BOOLEAN | Updated by PriceLabs recommendations |
| `closed_to_departure` | BOOLEAN | Updated by PriceLabs recommendations |

> `pricelabs_price` is written only by the PriceLabs Lambda webhook. The PropertyHandler PATCH endpoint never modifies it.

**`pricelabs_ignored` semantics:**
- PropertyHandler UPSERT uses `COALESCE(EXCLUDED.pricelabs_ignored, existing)` — sending `null` preserves the current value, so regular price/availability saves don't reset ignore decisions.
- The `hasNoData` delete check requires `priceLabsIgnored === null` too, so an Ignore on an otherwise-empty row does not delete the row (and its `pricelabs_price`).
- Every new PriceLabs sync and a disconnect reset `pricelabs_ignored = false`, so fresh suggestions reappear.
- On disconnect, `nightly_price` is cleared only where it equals `pricelabs_price` (applied prices revert to base; intentional heuristic).

---

## Listing ID Format

PriceLabs listing IDs encode both host and property:

```
{hostId_with_dashes_replaced_by_underscores}_{propertyId_with_dashes_replaced_by_underscores}
```

Example: host `dd6ce745-cf0f-49c9-b93c-0c2c188cc7b9`, property `abc12345-...`  
→ `dd6ce745_cf0f_49c9_b93c_0c2c188cc7b9_abc12345_...`

---

## Connect Flow (POST /connect)

1. Updates the PriceLabs integration settings (sync URLs, features)
2. Saves connection record to `pricelabs_connection`
3. Pushes listings, calendar (730 days), and reservations in parallel
4. Returns `initial_sync` result for each

**Features enabled:**
- `min_stay`, `check_in`, `check_out`: ✅
- `monthly_weekly_discounts`, `extra_person_fee`, `los_pricing`, `delta_only`: ❌

---

## Sync Webhook Payload (POST /webhook/sync)

PriceLabs sends per-listing price recommendations:

```json
{
  "listing_id": "dd6ce745_..._abc12345_...",
  "last_refreshed": "2026-06-08T10:00:00Z",
  "data": [
    {
      "date": "2026-06-10",
      "price": 104,
      "min_stay": 2,
      "check_in": true,
      "check_out": true
    }
  ]
}
```

The Lambda writes `price` to `pricelabs_price` (not `nightly_price`) for each date.

**Batched writes:** a full PriceLabs sync pushes 12–18 months of prices per listing. Writing those one date at a time (SELECT + UPDATE per date) exceeded the 30s Lambda timeout and made syncs silently fail. `applyPriceRecommendations` (repository) therefore does one SELECT for all dates plus chunked multi-row upserts (250 rows per statement, `ON CONFLICT (property_id, calendar_date)`). Keep it this way — do not reintroduce per-date writes.

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PL_SYNC_URL` | Webhook URL for price sync |
| `PL_CALENDAR_TRIGGER_URL` | Webhook URL for calendar trigger |
| `PL_HOOK_URL` | Webhook URL for hook notifications |
| `PRICELABS_LAMBDA_NAME` | Used by PropertyHandler notifier (default: `PriceLabs-Integration`) |

SSM Parameters:
- `/pricelabs/integration_token` — API token
- `/pricelabs/integration_name` — Integration display name

---

## File Map (where everything lives)

**Backend — `backend/functions/PriceLabs-Integration/`**
| File | Responsibility |
|------|----------------|
| `business/service/priceLabsService.js` | Connect/disconnect, pushes (listings/calendar/reservations), webhook handlers, `syncForBookingChange` |
| `business/service/priceLabsApiClient.js` | Raw HTTP calls to the PriceLabs API (all endpoints) |
| `business/service/priceLabsWebhookVerifier.js` | HMAC signature verification of incoming webhooks |
| `data/repository.js` | DB access: connection records, batched price writes (`applyPriceRecommendations`), `ota_listing_ids` channel join, disconnect cleanup |

**Backend — triggers from other Lambdas (event-driven sync):**
| File | Trigger |
|------|---------|
| `PropertyHandler/business/service/priceLabsCalendarNotifier.js` | Property create/update → `listing_updated`; calendar override change → `calendar_updated` (fire-and-forget Lambda invoke) |
| `General-Bookings-CRUD-Bookings-develop/business/priceLabsBookingNotifier.js` | Booking created/modified/cancelled |

**Backend — PropertyHandler (apply/ignore persistence):**
`data/repository/propertyCalendarOverrideRepository.js` (SELECT/UPSERT with `pricelabs_ignored`), `controller/propertyController.js` (`normalizeCalendarOverridesPayload`).

**Frontend — `frontend/web/src/features/hostdashboard/`**
| File | Responsibility |
|------|----------------|
| `hostcalen/hooks/useCalendarSelection.js` | All state logic: suggestion/applied/ignored maps, `parseOverrideResponse`, optimistic Apply/Ignore/Undo handlers, `persistOverrides` merge |
| `hostcalen/components/Sidebar/DynamicPricingCard.jsx` | Sidebar card: suggestion → Apply/Ignore buttons; applied/ignored → Undo button |
| `hostcalen/components/CalendarGrid.jsx` | `PL €x` / `✓ PL` / `✗ PL` badges on tiles |
| `hostcalen/HostCalendar.jsx` | Wires hook state into grid + sidebar; hides PL data when disconnected |
| `hostpricelabs/` | Connect form (incl. signup link), status card (Sync data / Disconnect), `usePriceLabs` hook |

**Host documentation:** `docs/public/pricelabs-host-guide.md`

---

## PriceLabs API Gotchas (learned the hard way)

- Base URL is `https://api.pricelabs.co/v2/integration/api` — **not** `/v2/integration`.
- The `/integration` body requires an `integration` wrapper object.
- `regenerate_token`: omitting the field = no regeneration, but sending it **empty/blank regenerates the token** (default true). Always send `regenerate_token: false` explicitly, or the stored SSM token becomes invalid.
- `latitude`/`longitude` are **mandatory** on listings (fallback: Amsterdam 52.3676 / 4.9041).
- `country` must be ISO 3166-1 **alpha-3** (`NLD`, not `Netherlands`).
- Calendar dates must be `YYYY-MM-DD` (internally stored as integer `20260615` — convert).
- The URL-verification ping `{"verify": true}` has **no signature headers** — verification must be skipped for it or the URLs never register (returns 401 otherwise).
- PriceLabs can only generate prices after receiving the calendar: push `/calendar` first, then "Sync Now" works.
- Rate limit: 300 requests/minute per token (429 + `Retry-After`). Send calendar data one listing per request.
- Swagger spec: [app.swaggerhub.com/apis/PriceLabs/price-labs_connector/2.0.0](https://app.swaggerhub.com/apis/PriceLabs/price-labs_connector/2.0.0) (machine-readable via api.swaggerhub.com). Docs: [building-an-integration-with-pricelabs](https://help.pricelabs.co/portal/en/kb/articles/building-an-integration-with-pricelabs).

---

## Deploy

CI deploys automatically on any backend push to `acceptance` **or** `main` (`.github/workflows/deploy.yml`) — note both branches deploy to the **same** Lambda functions, so the last push wins.

Manual deploy from a Mac (use only for quick testing; CI is the source of truth):

```bash
cd backend/functions/PriceLabs-Integration
npm install                          # 1. install deps FIRST
rm -rf node_modules/database         # 2. copy ORM LAST — npm install prunes it!
cp -RL ../../ORM node_modules/database
zip -r /tmp/pricelabs.zip . --exclude "node_modules/.cache/*"
aws lambda update-function-code \
  --function-name PriceLabs-Integration \
  --zip-file fileb:///tmp/pricelabs.zip \
  --region eu-north-1
```

**PropertyHandler extras:** it depends on `sharp` (native binaries) and on packages that only exist in the root `backend/node_modules` in CI builds. From a Mac you must additionally run:

```bash
npm install --os=linux --cpu=x64 sharp                                  # Linux binaries, or Lambda crashes
npm install --no-save typeorm@0.3.24 pg@8.16.0 @aws-sdk/dsql-signer@3.821.0  # ORM runtime deps
# then (always last): rm -rf node_modules/database && cp -RL ../../ORM node_modules/database
```

Always back up the live function first so you can roll back in seconds:

```bash
aws lambda get-function --function-name <FN> --region eu-north-1 \
  --query 'Code.Location' --output text | xargs curl -s -o /tmp/<FN>-backup.zip
```

Lambda configuration (set manually, not in CI): PriceLabs-Integration runs with 512 MB / 120s timeout. The default 128 MB / 30s caused OOM-pressure and sync timeouts.

---

## Certification (status June 2026)

**Contact:** Saharsh Arya, Product Manager Integrations, support@pricelabs.co (occasionally Saumya, Product Specialist).
**Test account:** ID `352438`, dashboard login `omer.domits@hotmail.com` — this email is also the `user_token` in API calls. Developer account: `omer.uzun@domits.com`.

Certification form submitted on 2026-06-11 with evidence (API call results, PriceLabs dashboard, CloudWatch logs). Awaiting scheduling of the certification call.

Implemented API calls: `/integration`, `/listings`, `/calendar`, `/reservations`, `/get_prices`, `/status`. Not implemented: `/rate_plans`, multi-unit, amenities, weekly/monthly discounts, LOS pricing, extra person fees, delta pushes — feature changes after go-live must be coordinated with PriceLabs first.

**Known gaps / future work:**
- `booked_units` / `blocked_units` are hardcoded `0` in the calendar push (PriceLabs sees unavailability but not the reason; bookings are derivable from `/reservations`).
- Blocks are communicated via `/calendar` availability only, not as `/reservations` entries with status `blocked`.
- Auto-apply mode, min/max price thresholds, performance tracking and sync-failure alerts from issue #2297 are not built yet.
