import React from "react";

export default function PricingCard({ tempPrice, setTempPrice, onSetPrice }) {
  return (
    <div className="hc-card">
      <div className="hc-card-title">Add Price</div>

      <div className="hc-price-row">
        <label className="hc-input-label">Price €</label>
        <input
          className="hc-input"
          inputMode="decimal"
          placeholder="e.g. 120"
          value={tempPrice}
          onChange={(e) => setTempPrice(e.target.value)}
        />
        <button className="hc-btn primary" onClick={onSetPrice}>Set price</button>
      </div>

      <div className="hc-note">
        Seasonal & specific-day pricing supported
      </div>
    </div>
  );
}