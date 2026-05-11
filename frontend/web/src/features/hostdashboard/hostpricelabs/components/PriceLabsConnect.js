import React, { useState } from "react";
import "../styles/HostPriceLabs.css";

function PriceLabsConnect({ onConnect, isLoading, error, successMessage }) {
  const [email, setEmail] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    onConnect(email);
  };

  return (
    <div className="pl-connect">
      <div className="pl-connect__header">
        <div className="pl-connect__logo">PriceLabs</div>
        <h2 className="pl-connect__title">Connect PriceLabs</h2>
        <p className="pl-connect__description">
          Enter the email address you use to log in to PriceLabs. Domits will
          use this to link your properties and sync dynamic pricing
          recommendations directly into your calendar.
        </p>
      </div>

      <form className="pl-connect__form" onSubmit={handleSubmit}>
        <div className="pl-connect__field">
          <label className="pl-connect__label">PriceLabs account email</label>
          <input
            type="email"
            className="pl-connect__input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            disabled={isLoading}
          />
          <p className="pl-connect__hint">
            This is the email you registered with PriceLabs. Make sure PriceLabs
            has enabled the Domits integration on your account.
          </p>
        </div>

        {error         && <div className="pl-alert pl-alert--error">{error}</div>}
        {successMessage && <div className="pl-alert pl-alert--success">{successMessage}</div>}

        <button
          type="submit"
          className="pl-btn pl-btn--primary"
          disabled={isLoading || !email}
        >
          {isLoading ? "Connecting…" : "Connect PriceLabs"}
        </button>
      </form>
    </div>
  );
}

export default PriceLabsConnect;
