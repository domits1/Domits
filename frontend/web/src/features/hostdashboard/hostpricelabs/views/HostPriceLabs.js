import React, { useState } from "react";
import { usePriceLabs }       from "../hooks/usePriceLabs";
import PriceLabsConnect       from "../components/PriceLabsConnect";
import PriceLabsStatusCard    from "../components/PriceLabsStatusCard";
import "../styles/HostPriceLabs.css";

/**
 * HostPriceLabs
 * Main view for the PriceLabs integration in the host dashboard.
 */
function HostPriceLabs() {
  const {
    status,
    isLoading,
    isSyncing,
    error,
    successMessage,
    connect,
    disconnect,
    syncAll,
  } = usePriceLabs();

  const [showConnectForm, setShowConnectForm] = useState(false);

  if (isLoading && !status) {
    return (
      <div className="host-pl">
        <div className="host-pl__loading">Loading PriceLabs…</div>
      </div>
    );
  }

  const handleConnect = async (email) => {
    await connect(email);
    setShowConnectForm(false);
  };

  const isConnected = status?.connected;

  return (
    <div className="host-pl">
      <div className="host-pl__header">
        <h2 className="host-pl__title">PriceLabs</h2>
        {!isConnected && (
          <button
            className="pl-btn pl-btn--secondary"
            onClick={() => setShowConnectForm((v) => !v)}
          >
            {showConnectForm ? "Cancel" : "+ Connect PriceLabs"}
          </button>
        )}
      </div>

      {error          && <div className="pl-alert pl-alert--error"   style={{ marginBottom: "1rem" }}>{error}</div>}
      {successMessage && <div className="pl-alert pl-alert--success" style={{ marginBottom: "1rem" }}>{successMessage}</div>}

      {!isConnected && showConnectForm && (
        <PriceLabsConnect
          onConnect={handleConnect}
          isLoading={isLoading}
          error={null}
          successMessage={null}
        />
      )}

      {isConnected && (
        <PriceLabsStatusCard
          status={status}
          onSync={syncAll}
          onDisconnect={disconnect}
          isSyncing={isSyncing}
          isLoading={isLoading}
        />
      )}

      {!isConnected && !showConnectForm && (
        <div className="pl-alert pl-alert--info">
          No PriceLabs account connected yet. Click{" "}
          <strong>+ Connect PriceLabs</strong> to get started.
        </div>
      )}
    </div>
  );
}

export default HostPriceLabs;
