import React, { useEffect, useState } from "react";
import { formatYearMonth } from "../utils/date";
import { Auth } from "aws-amplify";
import { getAccessToken } from "../utils/getAccessToken";

export default function Toolbar({ view, setView, cursor, onPrev, onNext, selectedPropertyId, onPropertySelect }) {
  const [accommodations, setAccommodations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const user = await Auth.currentAuthenticatedUser();
        const hostId = user?.attributes?.["custom:hostId"] || user?.attributes?.sub || null;
        setUserId(hostId);
      } catch (err) {
        console.error("Auth error fetching user id:", err);
      }
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchAccommodations = async () => {
      setIsLoading(true);
      try {
        const url = new URL(
          "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/byHostId"
        );
        url.searchParams.set("hostId", userId);
        const token = getAccessToken();
        const res = await fetch(url.toString(), {
          method: "GET",
          headers: {
            Authorization: token,
          },
        });
        if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
        const data = await res.json();
        const accommodationsList = Array.isArray(data) ? data : [];
        setAccommodations(accommodationsList);

        // Auto-select first property if available and none selected
        if (accommodationsList.length > 0 && !selectedPropertyId && onPropertySelect) {
          onPropertySelect(accommodationsList[0]?.property?.id);
        }
      } catch (error) {
        console.error("Unexpected fetch error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccommodations().catch(console.error);
  }, [userId]);

  const handlePropertyChange = (e) => {
    if (onPropertySelect) {
      onPropertySelect(e.target.value);
    }
  };

  return (
    <div className="hc-toolbar">
      <div className="hc-toolbar-left">
        <button className="hc-icon-btn" onClick={onPrev} aria-label="Previous">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" fill="none" strokeWidth="2" />
          </svg>
        </button>
        <select className="hc-select" value={view} onChange={(e) => setView(e.target.value)}>
          <option value="month">Month</option>
        </select>

        <div className="hc-toolbar-center">
          <div className="hc-month-pill">{formatYearMonth(cursor)}</div>
        </div>

        <button className="hc-icon-btn" onClick={onNext} aria-label="Next">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M9 6l6 6-6 6" stroke="currentColor" fill="none" strokeWidth="2" />
          </svg>
        </button>
      </div>
      <div className="hc-toolbar-right">
        <span>Select your property</span>
        <select
          className="hc-select"
          value={selectedPropertyId || ""}
          onChange={handlePropertyChange}
          disabled={isLoading}
        >
          {isLoading && <option>Loading…</option>}
          {!isLoading && accommodations.length === 0 && <option>No properties found</option>}
          {!isLoading && accommodations.length > 0 && !selectedPropertyId && (
            <option value="">Select a property</option>
          )}
          {!isLoading &&
            accommodations.map((a) => (
              <option key={a?.property?.id} value={a?.property?.id}>
                {a?.property?.title ?? a?.property?.id}
              </option>
            ))}
        </select>
      </div>
    </div>
  );
}
