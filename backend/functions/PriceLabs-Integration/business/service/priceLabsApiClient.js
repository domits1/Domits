const BASE_URL = "https://api.pricelabs.co/v2/integration/api";

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

export async function updateIntegration(token, name, {
  syncUrl, calendarTriggerUrl, hookUrl, regenerateToken = false, features = {},
} = {}) {
  return request("POST", "/integration", {
    integration: {
      sync_url:             syncUrl,
      calendar_trigger_url: calendarTriggerUrl,
      hook_url:             hookUrl,
      regenerate_token:     regenerateToken,
      features,
    },
  }, token, name);
}

export async function pushListings(token, name, listings) {
  return request("POST", "/listings", { listings }, token, name);
}

export async function pushCalendar(token, name, data) {
  return request("POST", "/calendar", data, token, name);
}

export async function getPrices(token, name, listingIds) {
  return request("GET", `/get_prices?listing_ids=${listingIds.join(",")}`, null, token, name);
}

export async function pushReservations(token, name, reservations) {
  return request("POST", "/reservations", { reservations }, token, name);
}

export async function getStatus(token, name, listingIds) {
  const qs = listingIds?.length ? `?listing_ids=${listingIds.join(",")}` : "";
  return request("GET", `/status${qs}`, null, token, name);
}
