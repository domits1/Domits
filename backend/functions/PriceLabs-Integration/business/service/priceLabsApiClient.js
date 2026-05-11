/**
 * priceLabsApiClient.js
 * Low-level HTTP client for the PriceLabs IAPI v2.
 *
 * Base URL: https://api.pricelabs.co/v2
 * Auth headers sent on every request to PriceLabs:
 *   X-INTEGRATION-NAME  → constant "domits"
 *   X-INTEGRATION-TOKEN → stored in SSM, refreshable via /integration
 */

const BASE_URL = "https://api.pricelabs.co/v2";

function headers(token, name) {
  return {
    "Content-Type":       "application/json",
    "X-INTEGRATION-NAME":  name,
    "X-INTEGRATION-TOKEN": token,
  };
}

async function request(method, path, body, token, name) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: headers(token, name),
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!res.ok) {
    const err = new Error(data.message || data.error || `PriceLabs ${res.status}`);
    err.status = res.status;
    err.body   = data;
    throw err;
  }
  return data;
}

// ── /integration ────────────────────────────────────────────────────────────

/**
 * Set the 3 webhook URLs and optionally regenerate the token.
 * Call once during initial setup, and whenever URLs change.
 */
export async function updateIntegration(token, name, {
  syncUrl, calendarTriggerUrl, hookUrl, regenerateToken = false, features = {},
} = {}) {
  return request("POST", "/integration", {
    sync_url:              syncUrl,
    calendar_trigger_url:  calendarTriggerUrl,
    hook_url:              hookUrl,
    regenerate_token:      regenerateToken,
    features,
  }, token, name);
}

// ── /listings ────────────────────────────────────────────────────────────────

/**
 * Push one or more listings to PriceLabs.
 * user_token = host's registered PriceLabs email.
 */
export async function pushListings(token, name, listings) {
  return request("POST", "/listings", { listings }, token, name);
}

// ── /calendar ────────────────────────────────────────────────────────────────

/**
 * Push calendar data (prices + availability) for a listing.
 * data: { listing_id, user_token, calendar: [{ date, price, available, min_stay, ... }] }
 */
export async function pushCalendar(token, name, data) {
  return request("POST", "/calendar", data, token, name);
}

// ── /get_prices ──────────────────────────────────────────────────────────────

/**
 * Fetch latest dynamic prices from PriceLabs.
 * Only call after sync_url is triggered.
 */
export async function getPrices(token, name, listingIds) {
  return request("GET", `/get_prices?listing_ids=${listingIds.join(",")}`, null, token, name);
}

// ── /reservations ────────────────────────────────────────────────────────────

/**
 * Push reservations to PriceLabs for Portfolio Analytics.
 */
export async function pushReservations(token, name, reservations) {
  return request("POST", "/reservations", { reservations }, token, name);
}

// ── /status ──────────────────────────────────────────────────────────────────

export async function getStatus(token, name, listingIds) {
  const qs = listingIds?.length ? `?listing_ids=${listingIds.join(",")}` : "";
  return request("GET", `/status${qs}`, null, token, name);
}
