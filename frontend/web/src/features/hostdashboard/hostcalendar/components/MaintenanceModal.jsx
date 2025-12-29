import React, { useState, useEffect } from "react";
import "./MaintenanceModal.scss";

export default function MaintenanceModal({ isOpen, onClose, onSave, selectedDates }) {
  const [note, setNote] = useState("");
  useEffect(() => {
    console.log('🎭 MaintenanceModal isOpen changed:', isOpen);
    console.log('Selected dates:', selectedDates);

    if (!isOpen) {
      setNote("");
    }
  }, [isOpen, selectedDates]);

  console.log('🎭 MaintenanceModal render - isOpen:', isOpen);

  if (!isOpen) {
    console.log('Modal not open, returning null');
    return null;
  }
  console.log('✅ Rendering modal content');

  const handleSave = () => {
    if (!note.trim()) {
      alert("Please enter a note for maintenance");
      return;
    }

    onSave(note);
    setNote("");
    onClose();
  };

  const handleOverlayClick = (e) => {
    if (e.target.className === "maintenance-modal-overlay") {
      onClose();
    }
  };
  return (
    <div className="maintenance-modal-overlay" onClick={handleOverlayClick}>
      <div className="maintenance-modal">
        <div className="modal-header">
          <h3>Add Maintenance Note</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="selected-dates-info">
            <strong>Selected Dates:</strong>
            <p className="date-count">
              {selectedDates.length} date{selectedDates.length !== 1 ? 's' : ''} selected
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="maintenance-note">
              Maintenance Note <span className="required">*</span>
            </label>
            <textarea
              id="maintenance-note"
              className="maintenance-textarea"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Enter reason for maintenance (e.g., Plumbing repair, Deep cleaning, Painting, etc.)"
              rows={4}
              autoFocus
            />
            <div className="char-count">
              {note.length} / 500 characters
            </div>
          </div>

          <div className="info-box">
            <p><strong>ℹ️ Note:</strong> This maintenance note will be saved and can be viewed later. The selected dates will be marked as unavailable for booking.</p>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!note.trim()}>
            Save Maintenance
          </button>
        </div>
      </div>
    </div>
  );
}
