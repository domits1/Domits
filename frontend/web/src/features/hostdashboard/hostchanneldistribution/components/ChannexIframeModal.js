import React, { useId } from "react";
import PropTypes from "prop-types";
import ChannexModalShell from "./ChannexModalShell";
import { isChannexUrl } from "../utils/channexUrl";

// The popup permissions are there because an OTA login may open its own window. Top navigation is
// deliberately absent, so the embedded page cannot send this page somewhere else.
const IFRAME_SANDBOX = "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox";

const OPEN_ERROR_MESSAGE = "We couldn't open the Channex screen.";

// The host connects the OTA in Channex's own screen. Every way out calls onClose, so the caller can
// read the channels again whether or not Channex reported that the host finished. The host can always
// leave: this modal never blocks closing. Escape only works while focus is outside the frame, because
// keys typed inside a cross-origin frame never reach this page; the X and Done buttons cover that.
function ChannexIframeModal({ platform, url, onClose }) {
  const titleId = useId();
  const title = `Connect ${platform.name} through Channex`;
  const canEmbed = isChannexUrl(url);

  return (
    <ChannexModalShell titleId={titleId} title={title} onClose={onClose} wide>
      {canEmbed ? (
        <>
          <iframe className="chdist-iframe" title={title} src={url} sandbox={IFRAME_SANDBOX} />
          <p className="chdist-modal__note">
            To disconnect, use the switch on the Distribution page. If you deactivate here, your listing stays open for
            sale on {platform.name} and you must close your dates there yourself.
          </p>
        </>
      ) : (
        <p className="chdist-modal__error">{OPEN_ERROR_MESSAGE}</p>
      )}
      <div className="chdist-modal__actions">
        <button type="button" className="chdist-btn chdist-btn--primary" onClick={onClose}>
          Done
        </button>
      </div>
    </ChannexModalShell>
  );
}

ChannexIframeModal.propTypes = {
  platform: PropTypes.shape({
    otaCode: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  }).isRequired,
  url: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};

export default ChannexIframeModal;
