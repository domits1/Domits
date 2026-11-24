import React from "react";
import PropTypes from "prop-types";
import { CONNECT_STEP } from "../hooks/useConnectFlow";
import ConnectChecklistModal from "./ConnectChecklistModal";
import TimezoneModal from "./TimezoneModal";
import ChannexIframeModal from "./ChannexIframeModal";

const CONNECTING_MESSAGE = "Connecting…";
const ENABLING_MESSAGE = "Setting up your listing…";

// What the connect flow puts on screen for its current step: the message of the last failure, a
// sentence while a request runs, and the modal of the step. All of it comes from the useConnectFlow
// result, so the section only decides where to put it. showError is off while another notice already
// tells the host the same thing, and so is showEnabling while the notice of a listing being set up
// already says it.
function ConnectFlowLayer({ connectFlow, showError = true, showEnabling = true }) {
  return (
    <>
      {showError && connectFlow.errorMessage && (
        <p className="host-chdist__error-text" role="alert">
          {connectFlow.errorMessage}
        </p>
      )}
      {showEnabling && connectFlow.step === CONNECT_STEP.ENABLING && (
        <output className="host-chdist__empty-text">{ENABLING_MESSAGE}</output>
      )}
      {connectFlow.step === CONNECT_STEP.CONNECTING && (
        <output className="host-chdist__empty-text">{CONNECTING_MESSAGE}</output>
      )}
      {connectFlow.step === CONNECT_STEP.CHECKLIST && (
        <ConnectChecklistModal
          platform={connectFlow.platform}
          onContinue={connectFlow.continueFromChecklist}
          onClose={connectFlow.cancel}
        />
      )}
      {connectFlow.step === CONNECT_STEP.TIMEZONE && (
        <TimezoneModal
          options={connectFlow.listing.distribution.timezone.options}
          onContinue={connectFlow.continueFromTimezone}
          onClose={connectFlow.cancel}
        />
      )}
      {connectFlow.step === CONNECT_STEP.IFRAME && (
        <ChannexIframeModal platform={connectFlow.platform} url={connectFlow.url} onClose={connectFlow.closeIframe} />
      )}
    </>
  );
}

ConnectFlowLayer.propTypes = {
  connectFlow: PropTypes.shape({
    step: PropTypes.string.isRequired,
    errorMessage: PropTypes.string.isRequired,
    platform: PropTypes.object,
    listing: PropTypes.object,
    url: PropTypes.string,
    cancel: PropTypes.func.isRequired,
    continueFromChecklist: PropTypes.func.isRequired,
    continueFromTimezone: PropTypes.func.isRequired,
    closeIframe: PropTypes.func.isRequired,
  }).isRequired,
  showError: PropTypes.bool,
  showEnabling: PropTypes.bool,
};

export default ConnectFlowLayer;
