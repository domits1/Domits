import { Auth } from "aws-amplify";

const BASE = process.env.REACT_APP_API_URL || "";

async function authHeaders() {
  const session = await Auth.currentSession();
  const token   = session.getAccessToken().getJwtToken();
  return {
    "Content-Type":  "application/json",
    "Authorization": `Bearer ${token}`,
  };
}

async function call(method, path, body) {
  const res = await fetch(`${BASE}/pricelabs${path}`, {
    method,
    headers: await authHeaders(),
    body:    body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "PriceLabs API error");
  return data;
}

export const connectPriceLabs       = (pricelabs_email)       => call("POST",   "/connect",             { pricelabs_email });
export const disconnectPriceLabs    = ()                       => call("DELETE", "/disconnect");
export const getPriceLabsStatus     = ()                       => call("GET",    "/status");
export const pushPriceLabsListings  = ()                       => call("POST",   "/push/listings");
export const pushPriceLabsCalendar  = (listing_ids)            => call("POST",   "/push/calendar",       { listing_ids });
export const pushPriceLabsReservations = ()                    => call("POST",   "/push/reservations");
