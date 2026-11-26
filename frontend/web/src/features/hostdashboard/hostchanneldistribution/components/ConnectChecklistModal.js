import React, { useId, useState } from "react";
import PropTypes from "prop-types";
import ChannexModalShell from "./ChannexModalShell";
import { describeConnectChecklist } from "../utils/connectChecklist";

// First step of connecting an OTA. Nothing is requested from here: Continue only tells the caller
// that every line was confirmed, so a host who backs out has changed nothing.
function ConnectChecklistModal({ platform, onContinue, onClose }) {
  const titleId = useId();
  const lines = describeConnectChecklist(platform.otaCode);
  // Ticked line indexes. Lines are static for the life of the modal, so the index is a stable key.
  const [ticked, setTicked] = useState(() => new Set());
  const allTicked = ticked.size === lines.length;

  const toggle = (index) =>
    setTicked((previous) => {
      const next = new Set(previous);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  return (
    <ChannexModalShell titleId={titleId} title={`Connect ${platform.name}`} onClose={onClose}>
      <p className="chdist-modal__note">Confirm each line before you continue.</p>
      <ul className="chdist-checklist">
        {lines.map((line, index) => (
          <li key={line}>
            <label className="chdist-checklist__item">
              <input type="checkbox" checked={ticked.has(index)} onChange={() => toggle(index)} />
              <span>{line}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="chdist-modal__actions">
        <button type="button" className="chdist-btn chdist-btn--secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="chdist-btn chdist-btn--primary" disabled={!allTicked} onClick={onContinue}>
          Continue
        </button>
      </div>
    </ChannexModalShell>
  );
}

ConnectChecklistModal.propTypes = {
  platform: PropTypes.shape({
    otaCode: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  }).isRequired,
  onContinue: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ConnectChecklistModal;
