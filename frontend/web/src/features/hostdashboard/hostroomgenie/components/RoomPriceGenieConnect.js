import React, { useState } from "react";
import "../styles/HostRoomPriceGenie.css";

function RoomPriceGenieConnect({ properties = [], onConnect, isLoading, error, successMessage }) {
  const [propertyId, setPropertyId]           = useState("");
  const [rpgPropertyCode, setRpgPropertyCode] = useState("");
  const [clientId, setClientId]               = useState("");
  const [clientSecret, setClientSecret]       = useState("");
  const [showSecret, setShowSecret]           = useState(false);
  const [syncMode, setSyncMode]               = useState("manual");
  const [minPrice, setMinPrice]               = useState("");
  const [maxPrice, setMaxPrice]               = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!propertyId || !rpgPropertyCode || !clientId || !clientSecret) return;
    onConnect(propertyId, rpgPropertyCode, clientId, clientSecret, {
      syncMode,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    });
  };

  return (
    <div className="rpg-connect">
      <div className="rpg-connect__header">
        <div className="rpg-connect__logo">RoomPriceGenie</div>
        <h2 className="rpg-connect__title">Connect RoomPriceGenie</h2>
        <p className="rpg-connect__description">
          Connect your RoomPriceGenie account to automatically receive dynamic
          pricing recommendations for your property. Credentials are provided
          by RoomPriceGenie during onboarding.
        </p>
      </div>

      <form className="rpg-connect__form" onSubmit={handleSubmit}>

        <div className="rpg-connect__field">
          <label className="rpg-connect__label">Property</label>
          <select
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            className="rpg-connect__input"
            required
            disabled={isLoading}
          >
            <option value="">Select a property…</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.unitname || p.id}</option>
            ))}
          </select>
        </div>

        <div className="rpg-connect__field">
          <label className="rpg-connect__label">RPG Property Code</label>
          <input
            type="text"
            value={rpgPropertyCode}
            onChange={(e) => setRpgPropertyCode(e.target.value)}
            placeholder="e.g. HOTEL_ABC_123"
            className="rpg-connect__input"
            required
            disabled={isLoading}
          />
          <p className="rpg-connect__hint">Provided by RoomPriceGenie during your Technical Kickoff Call.</p>
        </div>

        <div className="rpg-connect__field">
          <label className="rpg-connect__label">Client ID</label>
          <input
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="Your RPG client_id"
            className="rpg-connect__input"
            required
            disabled={isLoading}
          />
        </div>

        <div className="rpg-connect__field">
          <label className="rpg-connect__label">Client Secret</label>
          <div className="rpg-connect__input-row">
            <input
              type={showSecret ? "text" : "password"}
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="Your RPG client_secret"
              className="rpg-connect__input"
              required
              disabled={isLoading}
            />
            <button
              type="button"
              className="rpg-connect__toggle"
              onClick={() => setShowSecret((v) => !v)}
            >
              {showSecret ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div className="rpg-connect__divider">Optional settings</div>

        <div className="rpg-connect__field">
          <label className="rpg-connect__label">Sync mode</label>
          <select
            value={syncMode}
            onChange={(e) => setSyncMode(e.target.value)}
            className="rpg-connect__input"
            disabled={isLoading}
          >
            <option value="manual">Manual – push data yourself</option>
            <option value="auto">Auto – RoomPriceGenie pushes prices via webhook</option>
          </select>
        </div>

        <div className="rpg-connect__row">
          <div className="rpg-connect__field">
            <label className="rpg-connect__label">Minimum price (€)</label>
            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="e.g. 50"
              className="rpg-connect__input"
              min={0}
              disabled={isLoading}
            />
          </div>
          <div className="rpg-connect__field">
            <label className="rpg-connect__label">Maximum price (€)</label>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="e.g. 500"
              className="rpg-connect__input"
              min={0}
              disabled={isLoading}
            />
          </div>
        </div>

        {error && <div className="rpg-alert rpg-alert--error">{error}</div>}
        {successMessage && <div className="rpg-alert rpg-alert--success">{successMessage}</div>}

        <button
          type="submit"
          className="rpg-btn rpg-btn--primary"
          disabled={isLoading || !propertyId || !rpgPropertyCode || !clientId || !clientSecret}
        >
          {isLoading ? "Connecting…" : "Connect RoomPriceGenie"}
        </button>
      </form>
    </div>
  );
}

export default RoomPriceGenieConnect;
