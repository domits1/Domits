import React, { useState } from "react";
import "./IcalSync.scss";

const CALENDAR_OPTIONS = [
  { value: "GENERAL", label: "General" },
  { value: "VRBO", label: "VRBO" },
  { value: "BOOKING", label: "Booking" },
  { value: "AIRBNB", label: "Airbnb" },
];

export default function IcalSyncForm({ onImport, exportUrl, submitting }) {
  const [calendarUrl, setCalendarUrl] = useState("");
  const [calendarName, setCalendarName] = useState("");
  const [errors, setErrors] = useState({});
  const [copied, setCopied] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!calendarUrl.trim()) newErrors.calendarUrl = "Calendar URL is required.";
    if (!calendarName) newErrors.calendarName = "Calendar name is required.";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    onImport({
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
        <p className="ical-section-description">
          Connect an external calendar so Domits can import your bookings.
        </p>

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
            />
            {errors.calendarUrl && (
              <span className="error-text">{errors.calendarUrl}</span>
            )}
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

            {errors.calendarName && (
              <span className="error-text">{errors.calendarName}</span>
            )}
          </div>
        </div>

        <button type="submit" className="adminproperty-submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save calendar connection"}
        </button>
      </div>

      <div className="ical-section ical-section-export">
        <h3 className="ical-section-heading">2. Export</h3>
        <p className="ical-section-description">
          Use this Domits iCal address to sync your calendar with external platforms.
        </p>

        <div className="adminproperty-group">
          <label htmlFor="exportUrl">Domits iCal address</label>

          <div className="ical-export-row">
            <input id="exportUrl" type="text" value={exportUrl || ""} readOnly />
            <button
              type="button"
              className={`ical-copy-btn ${copied ? "copied" : ""}`}
              onClick={handleCopyExportUrl}
              disabled={!exportUrl}
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}