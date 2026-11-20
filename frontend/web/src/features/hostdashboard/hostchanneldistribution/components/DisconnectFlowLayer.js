import React from "react";
import PropTypes from "prop-types";
import { DISCONNECT_STEP } from "../hooks/useDisconnectFlow";
import DisconnectConfirmModal from "./DisconnectConfirmModal";

// What the turn-off flow puts on screen for its current step: the message of the last failure, a
// status sentence while the request runs (the card itself says "Turning off…"), and the confirm
// dialog. All of it comes from the useDisconnectFlow result.
function DisconnectFlowLayer({ disconnectFlow }) {
  const { step, platform, channel, errorMessage } = disconnectFlow;

  return (
    <>
      {errorMessage && (
        <p className="host-chdist__error-text" role="alert">
          {errorMessage}
        </p>
      )}
      {step === DISCONNECT_STEP.DISCONNECTING && (
        <output className="host-chdist__empty-text">{`Turning off ${platform.name}…`}</output>
      )}
      {step === DISCONNECT_STEP.CONFIRM && (
        <DisconnectConfirmModal
          platform={platform}
          upcomingBookingCount={channel.upcomingBookingCount}
          disconnectedOutsideDomits={Boolean(channel.disconnectedOutsideDomits)}
          onConfirm={disconnectFlow.confirm}
          onClose={disconnectFlow.cancel}
        />
      )}
    </>
  );
}

DisconnectFlowLayer.propTypes = {
  disconnectFlow: PropTypes.shape({
    step: PropTypes.string.isRequired,
    errorMessage: PropTypes.string.isRequired,
    platform: PropTypes.shape({ otaCode: PropTypes.string, name: PropTypes.string }),
    channel: PropTypes.shape({
      upcomingBookingCount: PropTypes.number,
      disconnectedOutsideDomits: PropTypes.bool,
    }),
    confirm: PropTypes.func.isRequired,
    cancel: PropTypes.func.isRequired,
  }).isRequired,
};

export default DisconnectFlowLayer;
