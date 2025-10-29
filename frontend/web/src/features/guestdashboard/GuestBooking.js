import React, { useEffect, useMemo, useRef, useState } from "react";
import { Auth } from "aws-amplify";
import { useNavigate } from "react-router-dom";
import dateFormatterDD_MM_YYYY from "../../utils/DateFormatterDD_MM_YYYY";

// API (unchanged path; now called with GET)
const API_FETCH_BOOKINGS =
  "https://j1ids2iygi.execute-api.eu-north-1.amazonaws.com/default/FetchGuestPayments";

/* ---------------- Helpers ---------------- */
function toDate(val) {
  if (val == null) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;

  if (typeof val === "number" || /^\d+$/.test(String(val))) {
    let n = Number(val);
    if (!Number.isFinite(n)) return null;
    if (String(Math.trunc(n)).length <= 10) n *= 1000; 
    const d = new Date(n);
    return isNaN(d.getTime()) ? null : d;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const d = new Date(`${val}T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

const isSameOrBefore = (a, b) => a && b && a.getTime() <= b.getTime();
const isSameOrAfter = (a, b) => a && b && a.getTime() >= b.getTime();
const inRange = (d, start, end) => isSameOrAfter(d, start) && isSameOrBefore(d, end);

// Treat these as “active stays”
const ACTIVE_STATUSES = new Set(["Accepted", "Paid", "Confirmed"]);

/** Prefer AccessToken for API Gateway User Pool authorizers; fall back to IdToken */
async function getBestAuthHeader() {
  try {
    const session = await Auth.currentSession();
    const accessToken = session?.getAccessToken?.().getJwtToken?.();
    const idToken = session?.getIdToken?.().getJwtToken?.();
    if (accessToken) return { Authorization: `Bearer ${accessToken}` };
    if (idToken) return { Authorization: `Bearer ${idToken}` };
  } catch {}
  return {};
}

/** GET bookings so Lambda hits controller.read() */
async function fetchGuestBookings(guestID, signal, attempts = 2) {
  const headersBase = {
    "x-correlation-id": crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
  };

  const authHeader = await getBestAuthHeader();

  // Be liberal: include both guestId & GuestID to satisfy any backend casing
  const url = new URL(API_FETCH_BOOKINGS);
  url.searchParams.set("guestId", guestID);
  url.searchParams.set("GuestID", guestID);

  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: { ...headersBase, ...authHeader },
        signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        const err = new Error(`GET ${res.status} ${res.statusText} ${text || ""}`.trim());
        err._status = res.status;
        err._text = text;
        throw err;
      }

      // response normalisation
      const json = await res.json().catch(async () => {
        const raw = await res.text();
        try { return JSON.parse(raw); } catch { return raw; }
      });

      if (Array.isArray(json)) return json;
      if (Array.isArray(json?.response)) return json.response;
      if (Array.isArray(json?.data)) return json.data;
      if (typeof json?.body === "string") {
        try {
          const inner = JSON.parse(json.body);
          if (Array.isArray(inner)) return inner;
          if (Array.isArray(inner?.response)) return inner.response;
        } catch {}
      }
      return [];
    } catch (e) {
      if (e.name === "AbortError") throw e;
      lastErr = e;
      await new Promise((r) => setTimeout(r, 350)); // brief backoff then retry
    }
  }
  throw lastErr || new Error("Request failed");
}

/* ---------------- Component ---------------- */
const BookingGuestDashboard = ({ timezone }) => {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [guestID, setGuestID] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const mountedRef = useRef(true);

  // Load Cognito user id (sub)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = await Auth.currentAuthenticatedUser();
        const sub = user?.attributes?.sub ?? user?.username ?? null;
        if (!cancelled) setGuestID(sub);
      } catch {
        try {
          const info = await Auth.currentUserInfo();
          if (!cancelled) setGuestID(info?.attributes?.sub ?? null);
        } catch (err2) {
          console.error("Auth error:", err2);
          if (!cancelled) setErrorMsg("Kon je sessie niet ophalen (auth).");
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Fetch with GET (so backend uses read())
  const doFetch = React.useCallback(() => {
    if (!guestID) return;
    const ac = new AbortController();
    (async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        const data = await fetchGuestBookings(guestID, ac.signal);
        if (!mountedRef.current) return;
        setBookings(Array.isArray(data) ? data : []);
      } catch (e) {
        if (e.name !== "AbortError") {
          console.error("Fetch bookings failed:", e);
          const hint =
            e._status === 401 || e._status === 403
              ? "\n\nTip: Check API Gateway authorizer (expects AccessToken vs IdToken) and that GET is enabled on this route."
              : String(e).includes("Failed to fetch")
              ? "\n\nTip: Likely CORS/OPTIONS issue—ensure GET responses include CORS headers."
              : "";
          if (mountedRef.current) setErrorMsg(`Boekingen ophalen mislukt.\n${e.message || e}\n${hint}`);
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [guestID]);

  useEffect(() => {
    const cleanup = doFetch();
    return cleanup;
  }, [doFetch]);

  useEffect(() => () => { mountedRef.current = false; }, []);


  const getStart = (b) =>
    toDate(
      b?.arrivaldate ??
      b?.arrival_date ??
      b?.arrivalDate ??
      b?.StartDate ?? b?.start_date ?? b?.checkIn
    );

  const getEnd = (b) =>
    toDate(
      b?.departuredate ??
      b?.departure_date ??
      b?.departureDate ??
      b?.EndDate ?? b?.end_date ?? b?.checkOut
    );

  const getStatusRaw = (b) => String(b?.status ?? b?.Status ?? "").trim();


  const now =
    timezone
      ? new Date(new Date().toLocaleString("en-US", { timeZone: timezone }))
      : new Date();

  
  const currentBookings = useMemo(
    () =>
      bookings.filter((b) => {
        const s = getStart(b);
        const e = getEnd(b);
        const status = getStatusRaw(b);
        const accepted = ACTIVE_STATUSES.has(status) || status === "";
        return accepted && s && e && inRange(now, s, e);
      }),
    [bookings, now]
  );

  const futureBookings = useMemo(
    () =>
      bookings
        .filter((b) => {
          const s = getStart(b);
          const e = getEnd(b);
          const status = getStatusRaw(b);
          const accepted = ACTIVE_STATUSES.has(status) || status === "";
          return accepted && s && e && s.getTime() > now.getTime();
        })
        .sort((a, b) => (getStart(a)?.getTime() ?? 0) - (getStart(b)?.getTime() ?? 0))
        .slice(0, 5),
    [bookings, now]
  );

  const pastBookings = useMemo(
    () =>
      bookings
        .filter((b) => {
          const e = getEnd(b);
          return e && e.getTime() < now.getTime();
        })
        .sort((a, b) => (getEnd(b)?.getTime() ?? 0) - (getEnd(a)?.getTime() ?? 0))
        .reverse()
        .slice(0, 5),
    [bookings, now]
  );

  const cancelledBookings = useMemo(
    () =>
      bookings
        .filter((b) => getStatusRaw(b).toLowerCase() === "cancelled")
        .sort((a, b) => {
          const da = toDate(a?.updatedAt ?? a?.createdAt)?.getTime() ?? 0;
          const db = toDate(b?.updatedAt ?? b?.createdAt)?.getTime() ?? 0;
          return db - da;
        })
        .slice(0, 5),
    [bookings]
  );

  const onRowClick = (propertyId, fallbackId) => {
    const id = propertyId ?? fallbackId;
    if (!id) return;
    navigate(`/listingdetails?ID=${encodeURIComponent(id)}`);
  };

  const Row = ({ b }) => {
    const s = getStart(b);
    const e = getEnd(b);
    const key = b?.id ?? b?.ID ?? `${b?.property_id ?? "prop"}-${s?.getTime() ?? "s"}-${e?.getTime() ?? "e"}`;

    const title =
      b?.Title ??
      b?.title ??
      b?.AccommodationName ??
      (b?.property_id ? `Property #${b.property_id}` : "-");

    const subline = [
      s && e ? `${dateFormatterDD_MM_YYYY(s)} → ${dateFormatterDD_MM_YYYY(e)}` : "-",
      b?.hostname ? ` • Host: ${b.hostname}` : null,
      b?.guests ? ` • Guests: ${b.guests}` : null,
      getStatusRaw(b) ? ` • ${getStatusRaw(b)}` : null,
    ]
      .filter(Boolean)
      .join("");

    return (
      <div
        key={key}
        className="guest-card-row is-clickable"
        onClick={() => onRowClick(b?.property_id, b?.id ?? b?.ID)}
        title="Open listing details"
        role="button"
        tabIndex={0}
        onKeyDown={(e) =>
          (e.key === "Enter" || e.key === " ") &&
          onRowClick(b?.property_id, b?.id ?? b?.ID)
        }
      >
        <div className="row-title">{title}</div>
        <div className="row-sub">{subline || "-"}</div>
      </div>
    );
  };

  return (
    <div className="guest-booking-page-body">
      <div className="guest-booking-dashboards"> 
        {/* <h2>{user.name ? `${user.name} Bookings` : "Bookings"}</h2> */}
        </div>

      <div className="guest-booking-bookingContent">
        {/* status row */}
        <div className="guest-booking-status">
          {loading ? (
            <span className="guest-booking-info">Loading bookings…</span>
          ) : errorMsg ? (
            <div className="guest-booking-error" role="alert" style={{ whiteSpace: "pre-wrap" }}>
              {errorMsg}
              <div style={{ marginTop: 8 }}>
                <button className="guest-booking-retry" onClick={doFetch} type="button">Retry</button>
              </div>
              <details style={{ marginTop: 8 }}>
                <summary>Troubleshoot tips</summary>
                <ul style={{ marginLeft: 16 }}>
                  <li><b>401/403?</b> API authorizer may require <code>AccessToken</code>. This component already prefers it.</li>
                  <li><b>TypeError: Failed to fetch</b> → CORS: ensure GET responses include <code>Access-Control-Allow-Origin</code> etc.</li>
                  <li><b>405 Method Not Allowed</b> → enable GET on this route in API Gateway.</li>
                </ul>
              </details>
            </div>
          ) : null}
        </div>

        {/* Summary cards */}
        <div className="guest-booking-summary-grid">
          {/* Current */}
          <div className="guest-card">
            <div className="guest-card-header">Current booking</div>
            <div className="guest-card-body">
              {currentBookings.length === 0 ? (
                <div className="guest-booking-info">No active stay today.</div>
              ) : (
                currentBookings.map((b) => <Row key={(b.ID ?? b.id) || Math.random()} b={b} />)
              )}
            </div>
          </div>

          {/* Upcoming */}
          <div className="guest-card">
            <div className="guest-card-header">Upcoming bookings</div>
            <div className="guest-card-body">
              {futureBookings.length === 0 ? (
                <div className="guest-booking-info">No upcoming stays.</div>
              ) : (
                futureBookings.map((b) => <Row key={(b.ID ?? b.id) || Math.random()} b={b} />)
              )}
            </div>
          </div>

          {/* Past */}
          <div className="guest-card">
            <div className="guest-card-header">Past bookings</div>
            <div className="guest-card-body">
              {pastBookings.length === 0 ? (
                <div className="guest-booking-info">No past stays yet.</div>
              ) : (
                pastBookings.map((b) => <Row key={(b.ID ?? b.id) || Math.random()} b={b} />)
              )}
            </div>
          </div>

          {/* Cancelled */}
          <div className="guest-card">
            <div className="guest-card-header">Cancelled bookings</div>
            <div className="guest-card-body">
              {cancelledBookings.length === 0 ? (
                <div className="guest-booking-info">No cancelled bookings.</div>
              ) : (
                cancelledBookings.map((b) => <Row key={(b.ID ?? b.id) || Math.random()} b={b} />)
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingGuestDashboard;
