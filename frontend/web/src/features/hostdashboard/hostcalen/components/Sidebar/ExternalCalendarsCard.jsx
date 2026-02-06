import React, { useState } from "react";
import Modal from "react-modal";
import IcalSyncForm from "../../../../../pages/icalsync/IcalSyncForm";

export default function ExternalCalendarsCard({ sources, onAddSource, onRemoveSource, onRefreshAll, exportUrl, onGenerateExport }) {
  const [isIcalModalOpen, setIsIcalModalOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState(null);

  const open = () => {
    setImportError(null);
    setIsIcalModalOpen(true);
  };

  const close = () => {
    setIsIcalModalOpen(false);
    setImportError(null);
  };

  const handleImport = async (payload) => {
    const propertyId = String(payload?.propertyId || "").trim();
    const calendarUrl = String(payload?.calendarUrl || "").trim();
    const calendarName = String(payload?.calendarName || "").trim();

    if (!propertyId) {
      setImportError("propertyId is required.");
      return;
    }
    if (!calendarUrl) {
      setImportError("calendarUrl is required.");
      return;
    }
    if (!calendarName) {
      setImportError("calendarName is required.");
      return;
    }

    setImportLoading(true);
    setImportError(null);

    try {
      await onAddSource?.({ propertyId, calendarUrl, calendarName });
      setIsIcalModalOpen(false);
    } catch (e) {
      setImportError(e?.message || "Failed to import calendar");
    } finally {
      setImportLoading(false);
    }
  };

  const list = Array.isArray(sources) ? sources : [];

  return (
    <>
      <div className="hc-card">
        <div className="hc-card-title">External calendars</div>

        <div className="hc-card-actions col">
          <button className="hc-btn ghost" disabled>
            Connect Google
          </button>

          <button className="hc-btn" onClick={open}>
            iCal & Calendar synchronization
          </button>

          <button className="hc-btn" onClick={() => onRefreshAll?.()}>
            Refresh all
          </button>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.9 }}>
          {list.length === 0 ? (
            <div>No connected calendars</div>
          ) : (
            list.map((s) => (
              <div key={s.sourceId} style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>
                  {s.calendarName || "EXTERNAL"}
                </div>
                <button className="hc-btn ghost" onClick={() => onRemoveSource?.(s.sourceId)}>
                  Disconnect
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal isOpen={isIcalModalOpen} onRequestClose={close} className="hc-modal" overlayClassName="hc-modal-overlay">
        <span className="ical-modal-close" onClick={close}>
          ×
        </span>

        {importError && <div className="ical-error-banner">{importError}</div>}

        <IcalSyncForm exportUrl={exportUrl} onImport={handleImport} submitting={importLoading} onGenerateExport={onGenerateExport} />
      </Modal>
    </>
  );
}