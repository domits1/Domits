import React, { useId, useRef, useState } from "react";
import PropTypes from "prop-types";
import ChannexModalShell from "./ChannexModalShell";
import { connectChannex } from "../services/channexDistributionService";

// Verified against backend/functions/.shared/channelManagement/channelManagementService.js,
// connectCredentialIntegration: "const integrationAccountId = existing?.id || randomUUID();" --
// a reconnect reuses the existing account row's id. Combined with providers/channex/
// credentialStore.js + integrationCredentialStore.js, where the secret name is derived from
// userId + integrationAccountId only, writing the new key overwrites the old one at that same
// location. The same function never calls this.props/this.roomTypes/this.ratePlans, so property
// mappings (keyed by that same integrationAccountId) are untouched by a reconnect.
const COPY = {
  add: {
    title: "Add channel",
    submitLabel: "Connect",
    note: null,
  },
  reconnect: {
    title: "Reconnect account",
    submitLabel: "Reconnect",
    note: "Reconnecting replaces your stored Channex API key. Your existing property mappings are kept.",
  },
};

const CONNECT_ERROR_MESSAGE = "Failed to connect to Channex.";

function ConnectChannexModal({ variant, userId, onClose, onConnected }) {
  const [apiKey, setApiKey] = useState("");
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const apiKeyInputRef = useRef(null);
  const titleId = useId();
  const copy = COPY[variant];

  const closeAndClear = () => {
    setApiKey("");
    onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedApiKey = apiKey.trim();
    if (!trimmedApiKey) {
      setErrorMessage("Enter a Channex API key before connecting.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    try {
      const data = await connectChannex({ userId, apiKey: trimmedApiKey });
      if (data.connected) {
        // Only clear the key on success. On rejection, keep it in the field so a typo can be
        // corrected without re-pasting (mirrors ChannexDiagnosticsPanel's existing connect form).
        setApiKey("");
        onConnected(data);
      } else {
        setErrorMessage("Channex rejected this API key. Check the key and try again.");
      }
    } catch (error) {
      // The host sees a fixed message; the real detail (method, endpoint, backend message) goes to the console.
      console.error("Failed to connect Channex:", error?.message || error);
      setErrorMessage(CONNECT_ERROR_MESSAGE);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ChannexModalShell
      titleId={titleId}
      title={copy.title}
      onClose={closeAndClear}
      closeDisabled={submitting}
      initialFocusRef={apiKeyInputRef}
    >
      <form className="chdist-modal__form" onSubmit={handleSubmit}>
        {copy.note && <p className="chdist-modal__note">{copy.note}</p>}

        <div className="chdist-modal__field">
          <label className="chdist-modal__label" htmlFor={`${titleId}-api-key`}>
            Channex API key
          </label>
          <div className="chdist-modal__input-row">
            <input
              ref={apiKeyInputRef}
              id={`${titleId}-api-key`}
              className="chdist-modal__input"
              type={apiKeyVisible ? "text" : "password"}
              autoComplete="off"
              spellCheck={false}
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              disabled={submitting}
            />
            <button
              type="button"
              className="chdist-btn chdist-btn--secondary"
              onClick={() => setApiKeyVisible((visible) => !visible)}
              disabled={submitting}
            >
              {apiKeyVisible ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {errorMessage && <p className="chdist-modal__error">{errorMessage}</p>}

        <div className="chdist-modal__actions">
          <button
            type="button"
            className="chdist-btn chdist-btn--secondary"
            onClick={closeAndClear}
            disabled={submitting}
          >
            Cancel
          </button>
          <button type="submit" className="chdist-btn chdist-btn--primary" disabled={submitting}>
            {submitting ? "Connecting…" : copy.submitLabel}
          </button>
        </div>
      </form>
    </ChannexModalShell>
  );
}

ConnectChannexModal.propTypes = {
  variant: PropTypes.oneOf(["add", "reconnect"]).isRequired,
  userId: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onConnected: PropTypes.func.isRequired,
};

export default ConnectChannexModal;
