import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { getIdToken } from "../../../services/getAccessToken";
import { API_REVIEW_BASE, hasReviewApprovalAccess } from "../../review/services/reviewAPI";

export const ReviewAlertsContext = createContext(null);
export const useReviewAlerts = () => useContext(ReviewAlertsContext);
export const adminKinds = { REVIEW_PENDING_APPROVAL: "approval", REVIEW_FLAGGED: "flagged", REVIEW_PENDING_PUBLICATION: "publication" };
const adminPath = "/hostdashboard/admin/review-approval";
const adminTabs = { approval: "pending-approval", flagged: "moderation", publication: "approved" };
const kinds = { NEW_REVIEW: "review", LOW_RATING: "low", DECLINING_RATING: "declining", RESPONSE_OVERDUE: "overdue", ...adminKinds };
const messages = { approval: "A guest review is awaiting approval.", flagged: "A review requires moderation.", publication: "An approved review is awaiting publication.", review: "A new review is available.", low: "A low rating requires attention.", declining: "Your property rating is declining.", overdue: "A review response is overdue." };
const adapt = (alert) => ({ id: alert.id, type: kinds[alert.alert_type] || "review",
  propertyId: alert.property_id, property: `Property ${alert.property_id}${adminKinds[alert.alert_type] ? ` / Review ${alert.review_id}` : ""}`,
  ...(adminKinds[alert.alert_type] ? { destination: `${adminPath}?tab=${adminTabs[kinds[alert.alert_type]]}&reviewId=${encodeURIComponent(alert.review_id)}` } : {}), read: alert.status !== "UNREAD",
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
  const administrator = pathname.startsWith("/hostdashboard/admin/");
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
      if (administrator) {
        const allowed = await hasReviewApprovalAccess();
        if (epoch !== generation.current) return;
        if (allowed !== true) throw Object.assign(new Error(allowed === false ? "Review administration access is required." : "Could not verify review administration access. Please retry."), { status: allowed === false ? 403 : 503 });
        setState(s => ({ ...s, allowed: true }));
      }
      let result, records = [], cursor = offset;
      do {
        result = await requestAlerts(`?limit=50&offset=${cursor}`);
        if (!Array.isArray(result.alerts)) throw new Error("Invalid notification response.");
        records.push(...result.alerts); cursor += result.alerts.length;
        if (epoch !== generation.current) return;
      } while (administrator && result.alerts.length === 50);
      result = { ...result, alerts: records };
      if (!Array.isArray(result.alerts) || !Number.isInteger(result.unread_count)) throw new Error("Invalid notification response.");
      const rows = [...new Map(result.alerts.filter(a => !administrator || Object.keys(adminKinds).includes(a.alert_type))
        .map(adapt).filter(a => !a.dismissed).map(a => [a.id, a])).values()];
      if (epoch === generation.current) setState((s) => ({ alerts: [...new Map([...(append ? s.alerts : []), ...rows].map((a) => [a.id, a])).values()],
        allowed: administrator, unreadCount: administrator ? rows.filter(a => !a.read).length : result.unread_count, offset: offset + result.alerts.length, hasMore: !administrator && result.alerts.length === 50, loading: false, error: "" }));
    } catch (error) {
      if (epoch === generation.current) setState((s) => ({ ...s, ...(administrator && (error.status === 401 || error.status === 403) ? { alerts: [], unreadCount: 0, allowed: false } : {}), loading: false, authorizationError: error.status === 401 || error.status === 403, error: error.message || "Could not load notifications. Please sign in and retry." }));
    } finally { if (epoch === generation.current) busy.current = false; }
  };
  const update = async (id, action) => {
    if (busy.current || mutating.current || (administrator && !data.current.allowed)) return false;
    mutating.current = true; setPending(true);
    const epoch = generation.current;
    try {
      const result = await requestAlerts(`/${encodeURIComponent(id)}/${action}`, "PATCH");
      if (!result.alert || result.alert.id !== id || (administrator && !Object.keys(adminKinds).includes(result.alert.alert_type)) || !(action === "read" ? ["READ", "DISMISSED"] : ["DISMISSED"]).includes(result.alert.status)) throw new Error("Invalid notification response.");
      const updated = adapt(result.alert);
      if (epoch === generation.current) setState((s) => ({ ...s, error: "", alerts: s.alerts.map((a) => a.id === id ? updated : a).filter((a) => !a.dismissed),
        unreadCount: Math.max(0, s.unreadCount - (s.alerts.some((a) => a.id === id && !a.read) && updated.read ? 1 : 0)) }));
      return epoch === generation.current;
    } catch (error) {
      if (epoch === generation.current) setState((s) => ({ ...s, ...(administrator && (error.status === 401 || error.status === 403) ? { alerts: [], unreadCount: 0, allowed: false } : {}), authorizationError: error.status === 401 || error.status === 403, error: error.message || "Action failed. Please retry." }));
      return false;
    } finally { if (epoch === generation.current) { mutating.current = false; setPending(false); } }
  };
  useEffect(() => {
    const reset = () => {
      generation.current++; busy.current = false; mutating.current = false; setPending(false);
      data.current = { alerts: [], unreadCount: 0, loading: false, error: "", hasMore: false };
      setState(data.current);
      const epoch = generation.current;
      void Promise.resolve().then(() => { if (epoch === generation.current) void load(); });
    };
    reset();
    const refresh = () => { if (document.visibilityState === "visible") void load(); };
    window.addEventListener("authChanged", reset);
    document.addEventListener("visibilitychange", refresh);
    return () => { generation.current++; window.removeEventListener("authChanged", reset); document.removeEventListener("visibilitychange", refresh); };
    // Route activation starts one shared request; the list and bell never fetch independently.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, administrator]);
  return <ReviewAlertsContext.Provider value={{ ...state, administrator, pending, refresh: () => load(), loadMore: () => load(true), update }}>{children}</ReviewAlertsContext.Provider>;
}
