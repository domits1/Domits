import React from "react";
import arrowLeftIcon from "../../../../../images/arrow-left-icon.svg";

export default function CalendarSyncCard({
  domitsCalendarLink,
  externalCalendarUrlInput,
  calendarNameInput,
  onExternalCalendarUrlChange,
  onCalendarNameChange,
  onCopyDomitsCalendarLink,
  domitsCalendarLinkCopied,
  onAddCalendar,
  canAddCalendar,
  addingCalendar,
  addCalendarError,
  connectedSources,
  onBack,
}) {
  const sources = Array.isArray(connectedSources) ? connectedSources : [];

  return (
    <section className="hc-sync-card" aria-label="Sync calendars">
      <header className="hc-sync-header">
        <button
          type="button"
          className="hc-sync-back"
          onClick={() => onBack?.()}
          aria-label="Back to availability settings"
        >
          <img src={arrowLeftIcon} alt="" aria-hidden="true" className="hc-chevron-icon" />
        </button>
      </header>

      <h3 className="hc-sync-title">Sync calendars</h3>
      <p className="hc-sync-copy">
        Keep your availability up-to-date across different platforms. Sync calendars to automatically
        reflect changes in bookings.
      </p>

      <form
        className="hc-sync-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (canAddCalendar) {
            onAddCalendar?.();
          }
        }}
      >
        <section className="hc-sync-step">
          <h4 className="hc-sync-step-title">Step 1</h4>
          <p className="hc-sync-step-copy">Add this link to the other website.</p>

          <div className="hc-sync-link-box">
            <p className="hc-sync-field-label">Domits calendar link</p>
            <div className="hc-sync-copy-row">
              <input
                type="text"
                className="hc-sync-input hc-sync-input--readonly"
                value={domitsCalendarLink}
                readOnly
              />
              <button
                type="button"
                className={`hc-sync-copy-btn ${domitsCalendarLinkCopied ? "is-copied" : ""}`}
                disabled={!domitsCalendarLink}
                onClick={() => onCopyDomitsCalendarLink?.()}
              >
                {domitsCalendarLinkCopied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        </section>

        <section className="hc-sync-step">
          <h4 className="hc-sync-step-title">Step 2</h4>
          <p className="hc-sync-step-copy">
            Get a link ending in .ics from the other website and add it below.
          </p>

          <div className="hc-sync-fields">
            <input
              type="text"
              className="hc-sync-input"
              placeholder="Other website link"
              value={externalCalendarUrlInput}
              onChange={(event) => onExternalCalendarUrlChange?.(event.target.value)}
            />
            <input
              type="text"
              className="hc-sync-input"
              placeholder="Calendar name"
              value={calendarNameInput}
              onChange={(event) => onCalendarNameChange?.(event.target.value)}
            />
          </div>

          <button type="submit" className="hc-sync-add-btn" disabled={!canAddCalendar}>
            {addingCalendar ? "Adding..." : "+ Add calendar"}
          </button>
        </section>

        {addCalendarError ? <p className="hc-sync-error">{addCalendarError}</p> : null}

        {sources.length > 0 ? (
          <section className="hc-sync-connected">
            <p className="hc-sync-connected-title">Connected</p>
            <ul className="hc-sync-connected-list">
              {sources.map((source, index) => {
                const sourceId = String(source?.sourceId || source?.id || `${index}`);
                const sourceName = String(source?.calendarName || source?.name || "External calendar");
                return (
                  <li key={sourceId} className="hc-sync-connected-item">
                    {sourceName}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <p className="hc-sync-meta">
          This is a two-way connection. <a href="/helpdesk-host">Need help?</a> Learn how it works.
        </p>
      </form>
    </section>
  );
}
