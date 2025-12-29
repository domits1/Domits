import React, { useState } from 'react';
import MaintenanceModal from './MaintenanceModal';
export default function MaintenanceModalTest() {
  const [isOpen, setIsOpen] = useState(false);
  const [savedNote, setSavedNote] = useState('');

  const handleSave = (note) => {
    console.log('✅ Test: Note saved:', note);
    setSavedNote(note);
    setIsOpen(false);
    alert(`Note saved: ${note}`);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      padding: 20,
      background: 'white',
      border: '2px solid #f59e0b',
      borderRadius: 10,
      zIndex: 10000,
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
    }}>
      <h4 style={{ margin: '0 0 10px 0' }}>Modal Test</h4>
      <button
        onClick={() => setIsOpen(true)}
        style={{
          padding: '10px 20px',
          background: '#f59e0b',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          fontWeight: 600
        }}
      >
        Open Test Modal
      </button>

      {savedNote && (
        <div style={{ marginTop: 10, fontSize: 12, color: '#666' }}>
          Last saved: {savedNote}
        </div>
      )}

      <MaintenanceModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSave={handleSave}
        selectedDates={['2025-11-15', '2025-11-16', '2025-11-17']}
      />
    </div>
  );
}
