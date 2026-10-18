import React, { useId, useState } from "react";
import PropTypes from "prop-types";
import ChannexModalShell from "./ChannexModalShell";
import { disconnectChannex } from "../services/channexDistributionService";

// Verified against backend/functions/.shared/channelManagement/integrations/repositories/
// integrationAccountRepository.js: disconnect() only nulls externalAccountId/credentialsRef and
// sets status DISCONNECTED on the existing account row -- it never touches the property/room
// type/rate plan mapping tables, which are keyed by that same, unchanged integrationAccountId.
const DISCONNECT_NOTE = "Disconnecting stops Domits from using your Channex account. Your existing property mappings are kept.";

const DISCONNECT_ERROR_MESSAGE = "Failed to disconnect Channex.";

function DisconnectChannexModal({ userId, onClose, onDisconnected }) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const titleId = useId();

  const handleDisconnect = async () => {
    setSubmitting(true);
    setErrorMessage("");
    try {
      const data = await disconnectChannex({ userId });
      onDisconnected(data);
    } catch (error) {
      // The host sees a fixed message; the real detail (method, endpoint, backend message) goes to the console.
      console.error("Failed to disconnect Channex:", error?.message || error);
      setErrorMessage(DISCONNECT_ERROR_MESSAGE);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ChannexModalShell titleId={titleId} title="Disconnect Channex" onClose={onClose} closeDisabled={submitting}>
      <p className="chdist-modal__note">{DISCONNECT_NOTE}</p>

      {errorMessage && <p className="chdist-modal__error">{errorMessage}</p>}

      <div className="chdist-modal__actions">
        <button type="button" className="chdist-btn chdist-btn--secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </button>
        <button
          type="button"
          className="chdist-btn chdist-btn--danger"
          onClick={handleDisconnect}
          disabled={submitting}
        >
          {submitting ? "Disconnecting…" : "Disconnect"}
        </button>
      </div>
    </ChannexModalShell>
  );
}

DisconnectChannexModal.propTypes = {
  userId: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onDisconnected: PropTypes.func.isRequired,
};

export default DisconnectChannexModal;
