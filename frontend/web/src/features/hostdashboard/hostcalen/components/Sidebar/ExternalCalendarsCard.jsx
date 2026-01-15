import React, { useMemo, useState } from "react";
import Modal from "react-modal";
import IcalSyncForm from "../../../../../pages/icalsync/IcalSyncForm";
import { retrieveExternalCalendar } from "../../../../../utils/icalRetrieveHost";
import { buildBlockedSetFromIcsEvents } from "../../../../../utils/icalConvert";

export default function ExternalCalendarsCard({ onImportedBlockedKeys }) {
  const [isIcalModalOpen, setIsIcalModalOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState(null);
  const [importedCount, setImportedCount] = useState(0);

  const handleOpenIcalModal = () => {
    setImportError(null);
    setImportedCount(0);
    setIsIcalModalOpen(true);
  };

  const handleCloseIcalModal = () => {
    setIsIcalModalOpen(false);
    setImportError(null);
  };

  const handleImport = async (payload) => {
    const calendarUrl = String(payload?.calendarUrl || "").trim();

    if (!calendarUrl) {
      setImportError("calendarUrl is required.");
      return;
    }

    setImportLoading(true);
    setImportError(null);
    setImportedCount(0);

    try {
      const events = await retrieveExternalCalendar(calendarUrl);
      const blockedSet = buildBlockedSetFromIcsEvents(events);

      setImportedCount(blockedSet?.size || 0);
      onImportedBlockedKeys?.(blockedSet);

      setIsIcalModalOpen(false);
    } catch (e) {
      setImportError(e?.message || "Failed to import calendar");
    } finally {
      setImportLoading(false);
    }
  };

  const exportUrl = "";
  const exportLoading = false;

  return (
    <>
      <div className="hc-card">
        <div className="hc-card-title">External calendars</div>

        <div className="hc-card-actions col">
          <button className="hc-btn ghost" disabled>
            Connect Google
          </button>

          <button className="hc-btn" onClick={handleOpenIcalModal} disabled={exportLoading}>
            {exportLoading ? "Generating iCal link…" : "iCal & Calendar synchronization"}
          </button>

          <button className="hc-icon-btn" title="Refresh" disabled>
            ⟲
          </button>
        </div>

        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
          Imported blocked: {importedCount}
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

        <IcalSyncForm exportUrl={exportUrl} onImport={handleImport} submitting={importLoading} />
      </Modal>
    </>
  );
}