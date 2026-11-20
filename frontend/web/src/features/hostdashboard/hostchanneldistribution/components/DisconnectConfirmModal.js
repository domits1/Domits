import React, { useId } from "react";
import PropTypes from "prop-types";
import ChannexModalShell from "./ChannexModalShell";
import { describeDisconnectConfirm } from "../utils/disconnectConfirm";

// The "Are you sure?" before one OTA is turned off (design note #3954, D5). Nothing is requested
// from here: Turn off hands control to the caller, and every other way out closes the dialog.
function DisconnectConfirmModal({
  platform,
  upcomingBookingCount,
  disconnectedOutsideDomits = false,
  onConfirm,
  onClose,
}) {
  const titleId = useId();
  const { title, lines } = describeDisconnectConfirm({
    otaCode: platform.otaCode,
    upcomingBookingCount,
    disconnectedOutsideDomits,
  });

  return (
    <ChannexModalShell titleId={titleId} title={title} onClose={onClose}>
      {lines.map((line) => (
        <p key={line} className="chdist-modal__note">
          {line}
        </p>
      ))}
      <div className="chdist-modal__actions">
        <button type="button" className="chdist-btn chdist-btn--secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="chdist-btn chdist-btn--danger" onClick={onConfirm}>
          Turn off
        </button>
      </div>
    </ChannexModalShell>
  );
}

DisconnectConfirmModal.propTypes = {
  platform: PropTypes.shape({
    otaCode: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  }).isRequired,
  upcomingBookingCount: PropTypes.number,
  disconnectedOutsideDomits: PropTypes.bool,
  onConfirm: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default DisconnectConfirmModal;
