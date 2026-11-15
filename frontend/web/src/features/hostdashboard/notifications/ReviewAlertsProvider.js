import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { getIdToken } from "../../../services/getAccessToken";
import { API_REVIEW_BASE } from "../../review/services/reviewAPI";

export const ReviewAlertsContext = createContext(null);
export const useReviewAlerts = () => useContext(ReviewAlertsContext);
const kinds = { NEW_REVIEW: "review", LOW_RATING: "low", DECLINING_RATING: "declining", RESPONSE_OVERDUE: "overdue" };
const messages = { review: "A new review is available.", low: "A low rating requires attention.", declining: "Your property rating is declining.", overdue: "A review response is overdue." };
const adapt = (alert) => ({ id: alert.id, type: kinds[alert.alert_type] || "review",
  propertyId: alert.property_id, property: `Property ${alert.property_id}`, read: alert.status !== "UNREAD",
  dismissed: alert.status === "DISMISSED", timestamp: new Date(Number(alert.created_at)).toISOString(),
  message: messages[kinds[alert.alert_type]] || "Review feedback requires attention." });

export async function requestAlerts(path, method = "GET") {
  const token = await getIdToken();
  if (!token) throw new Error("Please sign in to manage review notifications.");
  const response = await fetch(`${API_REVIEW_BASE}/reviews/alerts${path}`, { method, headers: { Authorization: token } });
  if (!response.ok) throw Object.assign(new Error(response.status === 401 || response.status === 403 ?
    "Please sign in with an authorized host account." : "Could not update notifications. Please try again."), { status: response.status });
  return response.json();
}

export default function ReviewAlertsProvider({ children }) {
  const { pathname } = useLocation();
  const active = pathname === "/hostdashboard" || pathname.startsWith("/hostdashboard/");
  const [state, setState] = useState({ alerts: [], unreadCount: 0, loading: false, error: "", hasMore: false });
  const [pending, setPending] = useState(false);
  const data = useRef(state), generation = useRef(0), busy = useRef(false), mutating = useRef(false);
  data.current = state;
  const load = async (append = false) => {
    if (!active || busy.current || mutating.current) return;
    busy.current = true;
    const epoch = generation.current, offset = append ? data.current.offset || 0 : 0;
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const result = await requestAlerts(`?limit=50&offset=${offset}`);
      if (!Array.isArray(result.alerts) || !Number.isInteger(result.unread_count)) throw new Error("Invalid notification response.");
      const rows = result.alerts.map(adapt).filter((a) => !a.dismissed);
      if (epoch === generation.current) setState((s) => ({ alerts: [...new Map([...(append ? s.alerts : []), ...rows].map((a) => [a.id, a])).values()],
        unreadCount: result.unread_count, offset: offset + result.alerts.length, hasMore: result.alerts.length === 50, loading: false, error: "" }));
    } catch (error) {
      if (epoch === generation.current) setState((s) => ({ ...s, loading: false, authorizationError: error.status === 401 || error.status === 403, error: error.message || "Could not load notifications. Please sign in and retry." }));
    } finally { if (epoch === generation.current) busy.current = false; }
  };
  const update = async (id, action) => {
    if (busy.current || mutating.current) return;
    mutating.current = true; setPending(true);
    const epoch = generation.current;
    try {
      const result = await requestAlerts(`/${encodeURIComponent(id)}/${action}`, "PATCH");
      if (!result.alert || result.alert.id !== id) throw new Error("Invalid notification response.");
      const updated = adapt(result.alert);
      if (epoch === generation.current) setState((s) => ({ ...s, error: "", alerts: s.alerts.map((a) => a.id === id ? updated : a).filter((a) => !a.dismissed),
        unreadCount: Math.max(0, s.unreadCount - (s.alerts.some((a) => a.id === id && !a.read) && updated.read ? 1 : 0)) }));
      return epoch === generation.current;
    } catch (error) {
      if (epoch === generation.current) setState((s) => ({ ...s, authorizationError: error.status === 401 || error.status === 403, error: error.message || "Action failed. Please retry." }));
      return false;
    } finally { if (epoch === generation.current) { mutating.current = false; setPending(false); } }
  };
  useEffect(() => {
    const reset = () => {
      generation.current++; busy.current = false; mutating.current = false; setPending(false);
      data.current = { alerts: [], unreadCount: 0, loading: false, error: "", hasMore: false };
      setState(data.current);
      const epoch = generation.current;
      Promise.resolve().then(() => { if (epoch === generation.current) void load(); });
    };
    reset();
    const refresh = () => { if (document.visibilityState === "visible") void load(); };
    window.addEventListener("authChanged", reset);
    document.addEventListener("visibilitychange", refresh);
    return () => { generation.current++; window.removeEventListener("authChanged", reset); document.removeEventListener("visibilitychange", refresh); };
    // Route activation starts one shared request; the list and bell never fetch independently.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  return <ReviewAlertsContext.Provider value={{ ...state, pending, refresh: () => load(), loadMore: () => load(true), update }}>{children}</ReviewAlertsContext.Provider>;
}
