import React, { useState } from "react";
import PropTypes from "prop-types";
import "../styles/HostPriceLabs.css";

function PriceLabsConnect({ onConnect, isLoading = false, error = null, successMessage = null }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      await onConnect(email);
    } finally {
      setSubmitting(false);
    }
  };

  const loading = isLoading || submitting;

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
          <label htmlFor="pl-email-input" className="pl-connect__label">PriceLabs account email</label>
          <input
            id="pl-email-input"
            type="email"
            className="pl-connect__input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            disabled={loading}
          />
          <p className="pl-connect__hint">
            This is the email you registered with PriceLabs.
          </p>
        </div>

        {error          && <div className="pl-alert pl-alert--error">{error}</div>}
        {successMessage && <div className="pl-alert pl-alert--success">{successMessage}</div>}

        <button
          type="submit"
          className="pl-btn pl-btn--primary"
          disabled={loading || !email}
        >
          {loading ? (
            <span className="pl-btn__loading">
              <span className="pl-spinner" />
              <span>Connecting…</span>
            </span>
          ) : "Connect PriceLabs"}
        </button>

        <p className="pl-connect__signup">
          Don&apos;t have a PriceLabs account yet?{" "}
          <a
            href="https://hello.pricelabs.co/signup/"
            target="_blank"
            rel="noopener noreferrer"
            className="pl-connect__signup-link"
          >
            Create a free account
          </a>
          {" "}and come back here to connect it.
        </p>
      </form>
    </div>
  );
}

PriceLabsConnect.propTypes = {
  onConnect:      PropTypes.func.isRequired,
  isLoading:      PropTypes.bool,
  error:          PropTypes.string,
  successMessage: PropTypes.string,
};

export default PriceLabsConnect;
