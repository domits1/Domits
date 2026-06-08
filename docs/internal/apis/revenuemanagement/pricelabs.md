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
  Host clicks "Apply price"
              ↓
  PATCH /calendar/overrides → nightly_price = priceLabsPrice
```

The key design decision: **PriceLabs prices are never auto-applied.** They are stored separately as `pricelabs_price` and require explicit host approval.

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
| `min_stay` | INT | Updated by PriceLabs recommendations |
| `closed_to_arrival` | BOOLEAN | Updated by PriceLabs recommendations |
| `closed_to_departure` | BOOLEAN | Updated by PriceLabs recommendations |

> `pricelabs_price` is written only by the PriceLabs Lambda webhook. The PropertyHandler PATCH endpoint never modifies it.

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

## Deploy

```bash
cd backend/functions/PriceLabs-Integration
zip -r /tmp/pricelabs.zip . --exclude "node_modules/.cache/*"
aws lambda update-function-code \
  --function-name PriceLabs-Integration \
  --zip-file fileb:///tmp/pricelabs.zip \
  --region eu-north-1
```

---

## Certification Checklist (Saharsh Arya)

- [ ] Verify endpoint returns `{"success": true}` for `{"verify": true}` body
- [ ] Confirm signature verification works with signed headers
- [ ] Confirm PriceLabs dashboard shows synced listings
- [ ] Confirm `Sync Now` triggers prices in Domits calendar (as suggestions)
- [ ] Confirm "Apply price" applies suggestion to `nightly_price`
