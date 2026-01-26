import React, { useEffect, useMemo, useState } from "react";
import "./IcalSync.scss";
import { getAccessToken, getCognitoUserId } from "../../services/getAccessToken";

const CALENDAR_OPTIONS = [
  { value: "GENERAL", label: "General" },
  { value: "VRBO", label: "VRBO" },
  { value: "BOOKING", label: "Booking" },
  { value: "AIRBNB", label: "Airbnb" },
];

export default function IcalSyncForm({ onImport, exportUrl, submitting, onGenerateExport }) {
  const [accommodations, setAccommodations] = useState([]);
  const [isLoadingAcc, setIsLoadingAcc] = useState(false);
  const [userId, setUserId] = useState(null);

  const [propertyId, setPropertyId] = useState("");
  const [calendarUrl, setCalendarUrl] = useState("");
  const [calendarName, setCalendarName] = useState("");
  const [errors, setErrors] = useState({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = getCognitoUserId();
    setUserId(id);
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchAccommodations = async () => {
      setIsLoadingAcc(true);
      try {
        const url = new URL("https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/byHostId");
        url.searchParams.set("hostId", userId);

        const token = getAccessToken();
        const res = await fetch(url.toString(), { method: "GET", headers: { Authorization: token } });

        if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];
        setAccommodations(arr);

        const firstPid = arr?.[0]?.property?.id ? String(arr[0].property.id) : "";
        setPropertyId((prev) => (prev ? prev : firstPid));
      } catch {
        setAccommodations([]);
      } finally {
        setIsLoadingAcc(false);
      }
    };

    fetchAccommodations().catch(() => setIsLoadingAcc(false));
  }, [userId]);

  const propertyOptions = useMemo(() => {
    const arr = Array.isArray(accommodations) ? accommodations : [];
    return arr
      .map((a) => {
        const pid = a?.property?.id ? String(a.property.id) : "";
        const title = a?.property?.title ? String(a.property.title) : "";
        return pid ? { value: pid, label: title || pid } : null;
      })
      .filter(Boolean);
  }, [accommodations]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!userId) newErrors.userId = "No userId available.";
    if (!propertyId || !String(propertyId).trim()) newErrors.propertyId = "Select an accommodation first.";
    if (!calendarUrl.trim()) newErrors.calendarUrl = "Calendar URL is required.";
    if (!calendarName) newErrors.calendarName = "Calendar name is required.";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    onImport({
      propertyId: String(propertyId).trim(),
      calendarUrl: calendarUrl.trim(),
      calendarName,
    });
  };

  const handleCopyExportUrl = async () => {
    if (!exportUrl) return;
    await navigator.clipboard.writeText(exportUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <form className="adminproperty-form ical-sync-form" onSubmit={handleSubmit}>
      <h2 className="adminproperty-title">iCal &amp; synchronization</h2>

      <div className="ical-section">
        <h3 className="ical-section-heading">1. Import</h3>
        <p className="ical-section-description">Connect an external calendar so Domits can import your bookings.</p>

        {errors.userId && <div className="ical-error-banner">{errors.userId}</div>}

        <div className="adminproperty-group">
          <label htmlFor="propertyId">Property</label>

          <div className="field-wrapper">
            <select
              id="propertyId"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className={errors.propertyId ? "error" : ""}
              disabled={isLoadingAcc || !userId}
            >
              <option value="" disabled>
                {isLoadingAcc ? "Loading…" : "Choose a property"}
              </option>
              {propertyOptions.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>

            {errors.propertyId && <span className="error-text">{errors.propertyId}</span>}
          </div>
        </div>

        <div className="adminproperty-group">
          <label htmlFor="calendarUrl">Address of iCal (.ics file)</label>

          <div className="field-wrapper">
            <input
              id="calendarUrl"
              type="text"
              value={calendarUrl}
              onChange={(e) => setCalendarUrl(e.target.value)}
              placeholder="Paste the calendar address here"
              className={errors.calendarUrl ? "error" : ""}
              disabled={!userId}
            />
            {errors.calendarUrl && <span className="error-text">{errors.calendarUrl}</span>}
          </div>
        </div>

        <div className="adminproperty-group">
          <label htmlFor="calendarName">Calendar name</label>

          <div className="field-wrapper">
            <select
              id="calendarName"
              value={calendarName}
              onChange={(e) => setCalendarName(e.target.value)}
              className={errors.calendarName ? "error" : ""}
              disabled={!userId}
            >
              <option value="" disabled>
                Choose an external calendar name
              </option>
              {CALENDAR_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>

            {errors.calendarName && <span className="error-text">{errors.calendarName}</span>}
          </div>
        </div>

        <button type="submit" className="adminproperty-submit" disabled={submitting || !userId}>
          {submitting ? "Saving…" : "Save calendar connection"}
        </button>
      </div>

      <div className="ical-section ical-section-export">
        <h3 className="ical-section-heading">2. Export</h3>
        <p className="ical-section-description">Use this Domits iCal address to sync your calendar with external platforms.</p>

        <div className="adminproperty-group">
          <label htmlFor="exportUrl">Domits iCal address</label>

          <div className="ical-export-row">
            <input id="exportUrl" type="text" value={exportUrl || ""} readOnly />
            <button type="button" className={`ical-copy-btn ${copied ? "copied" : ""}`} onClick={handleCopyExportUrl} disabled={!exportUrl}>
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
        </div>

        <button type="button" className="adminproperty-submit" onClick={() => onGenerateExport?.()} disabled={!userId}>
          Generate new export link
        </button>
      </div>
    </form>
  );
}