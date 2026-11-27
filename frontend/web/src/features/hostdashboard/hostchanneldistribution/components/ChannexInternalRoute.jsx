import React, { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { CHANNEX_ACCESS_STATE, loadChannexAccessState } from "../../channexadmin/channexCertificationAccess";
import "../styles/HostChannelDistribution.css";

export const CHECKING_MESSAGE = "Checking your access to Distribution…";
export const NOT_AVAILABLE_MESSAGE = "Distribution isn't available for this account.";
export const ACCESS_ERROR_MESSAGE = "We couldn't check your access to Distribution.";

const CHECKING = "checking";

// UX guard only: the backend allowlist is the real protection for /integrations/channex/*.
function ChannexInternalRoute({ children }) {
  const [state, setState] = useState(CHECKING);

  const runCheck = useCallback(() => {
    setState(CHECKING);
    loadChannexAccessState()
      .catch(() => CHANNEX_ACCESS_STATE.ERROR)
      .then(setState);
  }, []);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  if (state === CHECKING) {
    return (
      <div className="host-chdist">
        <output className="host-chdist__empty-text">{CHECKING_MESSAGE}</output>
      </div>
    );
  }

  if (state === CHANNEX_ACCESS_STATE.ERROR) {
    return (
      <div className="host-chdist">
        <div className="host-chdist__error">
          <p className="host-chdist__error-text" role="alert">
            {ACCESS_ERROR_MESSAGE}
          </p>
          <button type="button" className="chdist-btn chdist-btn--primary" onClick={runCheck}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (state !== CHANNEX_ACCESS_STATE.ALLOWED) {
    return (
      <div className="host-chdist">
        <p className="host-chdist__empty-text" role="alert">
          {NOT_AVAILABLE_MESSAGE}
        </p>
      </div>
    );
  }

  return children;
}

ChannexInternalRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ChannexInternalRoute;
