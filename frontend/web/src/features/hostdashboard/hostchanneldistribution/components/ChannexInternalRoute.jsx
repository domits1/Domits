import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { loadChannexAccess } from "../../channexadmin/channexCertificationAccess";
import "../styles/HostChannelDistribution.css";

export const CHECKING_MESSAGE = "Checking your access to Distribution…";
export const NOT_AVAILABLE_MESSAGE = "Distribution isn't available for this account.";

// UX guard only: the backend allowlist is the real protection for /integrations/channex/*.
// loadChannexAccess swallows lookup errors, so a failed lookup and a 403 both end up as "not available".
function ChannexInternalRoute({ children }) {
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    let mounted = true;

    // Auth.currentAuthenticatedUser rejects for a signed-out user, so a rejection must also deny.
    loadChannexAccess()
      .catch(() => false)
      .then((isAllowed) => {
        if (mounted) setAllowed(isAllowed === true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (allowed === null) {
    return (
      <div className="host-chdist">
        <output className="host-chdist__empty-text">{CHECKING_MESSAGE}</output>
      </div>
    );
  }

  if (!allowed) {
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
