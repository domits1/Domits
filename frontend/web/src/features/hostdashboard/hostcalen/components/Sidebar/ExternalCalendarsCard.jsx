import React, { useState } from "react";
import Modal from "react-modal";
import IcalSyncForm from "../../../../../pages/icalsync/IcalSyncForm";

export default function ExternalCalendarsCard() {
  const [isIcalModalOpen, setIsIcalModalOpen] = useState(false);

  const handleOpenIcalModal = () => setIsIcalModalOpen(true);
  const handleCloseIcalModal = () => setIsIcalModalOpen(false);

  const handleImport = (payload) => {
    console.log("IMPORT PAYLOAD:", payload);
  };

  const dummyExportUrl = "https://api.domits.nl/ical?ownerId=123";

  return (
    <>
      <div className="hc-card">
        <div className="hc-card-title">External calendars</div>
        <div className="hc-card-actions col">
          <button className="hc-btn ghost" disabled>
            Connect Google
          </button>
          <button className="hc-btn ghost" onClick={handleOpenIcalModal}>
            Import .ics
          </button>
          <button className="hc-btn" onClick={handleOpenIcalModal}>
            Export .ics
          </button>
          <button className="hc-icon-btn" title="Refresh">
            ⟲
          </button>
        </div>
      </div>

      <Modal
        isOpen={isIcalModalOpen}
        onRequestClose={handleCloseIcalModal}
        className="hc-modal ical-modal"
        overlayClassName="hc-modal-overlay"
      >
        <div className="ical-modal-header">
          <h2>Calendar synchronization</h2>
          <button
            type="button"
            className="ical-close-btn"
            onClick={handleCloseIcalModal}
          >
            ×
          </button>
        </div>

        <IcalSyncForm
          exportUrl={dummyExportUrl}
          onImport={handleImport}
          submitting={false}
        />
      </Modal>
    </>
  );
}