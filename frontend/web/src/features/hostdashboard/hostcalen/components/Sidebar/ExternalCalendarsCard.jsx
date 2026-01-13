import React, { useMemo, useState } from "react";
import Modal from "react-modal";
import IcalSyncForm from "../../../../../pages/icalsync/IcalSyncForm";
import { retrieveExternalCalendar } from "../../../../../utils/icalRetrieveHost";
import { buildBlockedSetFromIcsEvents } from "../../../../../utils/icalConvert";
import { saveExternalBlockedDates } from "../../../../../utils/externalCalendarStorage";
import { getCognitoUserId } from "../../../../../services/getAccessToken";

export default function ExternalCalendarsCard({
  exportUrl,
  exportLoading,
  userId,
  onImportedBlockedDates,
}) {
  const [isIcalModalOpen, setIsIcalModalOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState(null);
  const [importSuccess, setImportSuccess] = useState(false);

  const effectiveUserId = useMemo(() => userId || getCognitoUserId(), [userId]);

  const handleOpenIcalModal = () => {
    setImportError(null);
    setImportSuccess(false);
    setIsIcalModalOpen(true);
  };

  const handleCloseIcalModal = () => {
    setIsIcalModalOpen(false);
    setImportError(null);
    setImportSuccess(false);
  };

  const handleImport = async ({ propertyId, calendarUrl, calendarName }) => {
    const pid = String(propertyId || "").trim();

    if (!pid) {
      setImportError("Select an accommodation first.");
      return;
    }

    if (!effectiveUserId) {
      setImportError("No userId available.");
      return;
    }

    setImportLoading(true);
    setImportError(null);
    setImportSuccess(false);

    try {
      const events = await retrieveExternalCalendar(calendarUrl);
      const blockedSet = buildBlockedSetFromIcsEvents(events);

      saveExternalBlockedDates({
        userId: effectiveUserId,
        propertyId: pid,
        blockedSet,
      });

      onImportedBlockedDates?.(blockedSet, {
        userId: effectiveUserId,
        propertyId: pid,
        calendarUrl,
        calendarName,
        events,
      });

      setImportSuccess(true);
      setIsIcalModalOpen(false);
    } catch (e) {
      setImportError(e?.message || "Failed to import calendar");
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <>
      <div className="hc-card">
        <div className="hc-card-title">External calendars</div>

        <div className="hc-card-actions col">
          <button className="hc-btn ghost" disabled>
            Connect Google
          </button>

          <button
            className="hc-btn"
            onClick={handleOpenIcalModal}
            disabled={exportLoading}
          >
            {exportLoading
              ? "Generating iCal link…"
              : "iCal & Calendar synchronization"}
          </button>

          <button className="hc-icon-btn" title="Refresh" disabled>
            ⟲
          </button>
        </div>
      </div>

      <Modal
        isOpen={isIcalModalOpen}
        onRequestClose={handleCloseIcalModal}
        className="hc-modal"
        overlayClassName="hc-modal-overlay"
      >
        <span className="ical-modal-close" onClick={handleCloseIcalModal}>
          ×
        </span>

        {importError && <div className="ical-error-banner">{importError}</div>}

        <IcalSyncForm
          exportUrl={exportUrl}
          onImport={handleImport}
          submitting={importLoading}
        />
      </Modal>
    </>
  );
}
