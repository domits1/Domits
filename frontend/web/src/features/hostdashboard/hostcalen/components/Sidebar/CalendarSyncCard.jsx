import React from "react";
import arrowLeftIcon from "../../../../../images/arrow-left-icon.svg";
import arrowRightIcon from "../../../../../images/arrow-right-icon.svg";
import calendarIcon from "../../../../../images/icons/calendar.png";

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
  const [isConnectionSetupOpen, setIsConnectionSetupOpen] = React.useState(false);
  const sources = Array.isArray(connectedSources) ? connectedSources : [];
  const hasConnections = sources.length > 0;
  const showConnectionSetup = !hasConnections || isConnectionSetupOpen;
  const handleBack = () => {
    if (hasConnections && isConnectionSetupOpen) {
      setIsConnectionSetupOpen(false);
      return;
    }
    onBack?.();
  };

  return (
    <section className="hc-sync-card" aria-label="Sync calendars">
      <header className="hc-sync-header">
        <button
          type="button"
          className="hc-sync-back"
          onClick={handleBack}
          aria-label={hasConnections && isConnectionSetupOpen ? "Back to sync overview" : "Back to summary"}
        >
          <img src={arrowLeftIcon} alt="" aria-hidden="true" className="hc-chevron-icon" />
        </button>
      </header>

      <h3 className="hc-sync-title">Sync calendars</h3>
      <p className="hc-sync-copy">
        Keep your availability up-to-date across different platforms. Sync calendars to automatically
        reflect changes in bookings.
      </p>

      {showConnectionSetup ? (
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
      ) : (
        <section className="hc-sync-step">
          <h4 className="hc-sync-step-title">Connect calendars</h4>
          <p className="hc-sync-step-copy">Sync all your hosting calendars so they stay up to date.</p>
          <button
            type="button"
            className="hc-availability-connect-btn"
            onClick={() => setIsConnectionSetupOpen(true)}
          >
            <span className="hc-availability-connect-btn-label">
              <span className="hc-availability-connect-btn-icon" aria-hidden="true">
                <img src={calendarIcon} alt="" />
              </span>
              <span>Connect to another website</span>
            </span>
            <img src={arrowRightIcon} alt="" aria-hidden="true" className="hc-chevron-icon" />
          </button>
        </section>
      )}
    </section>
  );
}
