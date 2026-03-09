import React from "react";
import PropTypes from "prop-types";
import CalendarSourceFields from "./CalendarSourceFields";

export default function ConnectionSetupForm({
  canAddCalendar,
  onAddCalendar,
  domitsCalendarLink,
  domitsCalendarLinkCopied,
  onCopyDomitsCalendarLink,
  externalCalendarUrlInput,
  onExternalCalendarUrlChange,
  calendarNameInput,
  onCalendarNameChange,
  calendarProviderInput,
  onCalendarProviderChange,
  addingCalendar,
  isEditingCalendar,
  addCalendarError,
  hasConnections,
  connectedSection,
}) {
  return (
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
        <p className="hc-sync-step-copy">Get a public iCal feed link from the other website and add it below.</p>

        <CalendarSourceFields
          externalCalendarUrlInput={externalCalendarUrlInput}
          onExternalCalendarUrlChange={onExternalCalendarUrlChange}
          calendarNameInput={calendarNameInput}
          onCalendarNameChange={onCalendarNameChange}
          calendarProviderInput={calendarProviderInput}
          onCalendarProviderChange={onCalendarProviderChange}
        />

        <button type="submit" className="hc-sync-add-btn" disabled={!canAddCalendar}>
          {addingCalendar ? "Adding..." : "+ Add calendar"}
        </button>
      </section>

      {!isEditingCalendar && addCalendarError ? <p className="hc-sync-error">{addCalendarError}</p> : null}

      {hasConnections ? connectedSection : null}

      <p className="hc-sync-meta">
        This is a two-way connection. <a href="/helpdesk-host">Need help?</a> Learn how it works.
      </p>
    </form>
  );
}

ConnectionSetupForm.propTypes = {
  canAddCalendar: PropTypes.bool,
  onAddCalendar: PropTypes.func,
  domitsCalendarLink: PropTypes.string,
  domitsCalendarLinkCopied: PropTypes.bool,
  onCopyDomitsCalendarLink: PropTypes.func,
  externalCalendarUrlInput: PropTypes.string,
  onExternalCalendarUrlChange: PropTypes.func,
  calendarNameInput: PropTypes.string,
  onCalendarNameChange: PropTypes.func,
  calendarProviderInput: PropTypes.string,
  onCalendarProviderChange: PropTypes.func,
  addingCalendar: PropTypes.bool,
  isEditingCalendar: PropTypes.bool,
  addCalendarError: PropTypes.string,
  hasConnections: PropTypes.bool,
  connectedSection: PropTypes.node,
};
