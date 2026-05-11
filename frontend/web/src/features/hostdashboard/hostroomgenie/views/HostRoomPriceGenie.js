import React, { useState } from "react";
import { useRoomPriceGenie } from "../hooks/useRoomPriceGenie";
import RoomPriceGenieConnect from "../components/RoomPriceGenieConnect";
import RoomPriceGeniePropertyCard from "../components/RoomPriceGeniePropertyCard";
import "../styles/HostRoomPriceGenie.css";

/**
 * HostRoomPriceGenie
 * Main view for the RoomPriceGenie integration in the host dashboard.
 * Shows connected properties + a form to add a new connection.
 */
function HostRoomPriceGenie({ properties = [] }) {
  const {
    integrations,
    isLoading,
    isPushing,
    error,
    successMessage,
    connect,
    disconnect,
    pushData,
  } = useRoomPriceGenie();

  const [showConnectForm, setShowConnectForm] = useState(false);

  if (isLoading && integrations.length === 0) {
    return (
      <div className="host-rpg">
        <div className="host-rpg__loading">Loading RoomPriceGenie…</div>
      </div>
    );
  }

  const handleConnect = async (...args) => {
    await connect(...args);
    setShowConnectForm(false);
  };

  return (
    <div className="host-rpg">
      <div className="host-rpg__header">
        <h2 className="host-rpg__title">RoomPriceGenie</h2>
        <button
          className="rpg-btn rpg-btn--secondary"
          onClick={() => setShowConnectForm((v) => !v)}
        >
          {showConnectForm ? "Cancel" : "+ Connect property"}
        </button>
      </div>

      {error && <div className="rpg-alert rpg-alert--error" style={{ marginBottom: "1rem" }}>{error}</div>}
      {successMessage && <div className="rpg-alert rpg-alert--success" style={{ marginBottom: "1rem" }}>{successMessage}</div>}

      {showConnectForm && (
        <RoomPriceGenieConnect
          properties={properties}
          onConnect={handleConnect}
          isLoading={isLoading}
          error={null}
          successMessage={null}
        />
      )}

      {integrations.length > 0 && (
        <div className="rpg-cards">
          {integrations.map((integration) => (
            <RoomPriceGeniePropertyCard
              key={integration.property_id}
              integration={integration}
              onPush={pushData}
              onDisconnect={disconnect}
              isPushing={isPushing}
              isLoading={isLoading}
            />
          ))}
        </div>
      )}

      {integrations.length === 0 && !showConnectForm && (
        <div className="rpg-alert rpg-alert--info">
          No properties connected yet. Click <strong>+ Connect property</strong> to get started.
        </div>
      )}
    </div>
  );
}

export default HostRoomPriceGenie;
