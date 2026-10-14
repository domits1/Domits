import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";

// Buckets the six CHANNEX_STATUS values from GET /integrations/channex/status into the three
// visual states this card renders. VALIDATION_FAILED, DISCONNECTED and RECONNECT_REQUIRED all
// read the same to a host ("something's wrong, reconnect"), so they share one look.
const RECONNECT_BUCKET_STATUSES = new Set(["RECONNECT_REQUIRED", "VALIDATION_FAILED", "DISCONNECTED"]);

// Which Manage menu items each status offers. A status with no entry here (only
// PENDING_PROVIDER_VALIDATION today) keeps Manage disabled -- there's nothing meaningful to
// reconnect or disconnect mid-validation. DISCONNECTED omits "disconnect": you can't disconnect
// an already-disconnected account.
const MANAGE_MENU_ITEMS_BY_STATUS = {
  CONNECTED: ["reconnect", "disconnect"],
  RECONNECT_REQUIRED: ["reconnect", "disconnect"],
  VALIDATION_FAILED: ["reconnect", "disconnect"],
  DISCONNECTED: ["reconnect"],
};

const MENU_ITEM_LABELS = { reconnect: "Reconnect", disconnect: "Disconnect" };

// One plain sentence per status. The backend's own `reason` is written for engineers (it names
// credentialsRef, providers and validation modes), so it is never shown to a host.
const STATUS_DESCRIPTIONS = {
  CONNECTED: "Your Channex account is connected.",
  RECONNECT_REQUIRED: "Your Channex connection needs to be set up again.",
  VALIDATION_FAILED: "Channex could not verify your account. Check your API key and reconnect.",
  DISCONNECTED: "Your Channex account is disconnected.",
  PENDING_PROVIDER_VALIDATION: "Channex is still verifying your account.",
  NOT_CONNECTED: "No Channex account is connected yet.",
};

function getStatusPresentation(status) {
  if (status === "CONNECTED") {
    return { tone: "success", label: "Connected" };
  }
  if (RECONNECT_BUCKET_STATUSES.has(status)) {
    return { tone: "error", label: "Reconnect needed" };
  }
  // PENDING_PROVIDER_VALIDATION: not reachable through the connect flow today, but the response
  // shape allows it, so it gets its own neutral state rather than being misread as an error.
  return { tone: "pending", label: "Validating…" };
}

function ChannexStatusCard({ status, onReconnectClick, onDisconnectClick, manageEnabled = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const presentation = getStatusPresentation(status.status);
  const menuItems = manageEnabled ? MANAGE_MENU_ITEMS_BY_STATUS[status.status] || null : null;
  const description = STATUS_DESCRIPTIONS[status.status];

  useEffect(() => {
    if (!menuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const handleItemClick = (item) => {
    setMenuOpen(false);
    if (item === "reconnect") onReconnectClick();
    if (item === "disconnect") onDisconnectClick();
  };

  return (
    <div className="chdist-card">
      <div className="chdist-card__row">
        <span className="chdist-card__name">{status.displayName || "Channex"}</span>
        <span className={`chdist-badge chdist-badge--${presentation.tone}`}>{presentation.label}</span>

        <div className="chdist-manage" ref={menuRef}>
          <button
            type="button"
            className="chdist-btn chdist-btn--manage"
            disabled={!menuItems}
            aria-haspopup="true"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}>
            Manage
          </button>
          {menuOpen && menuItems && (
            <ul className="chdist-manage__menu">
              {menuItems.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    className={`chdist-manage__item${item === "disconnect" ? " chdist-manage__item--danger" : ""}`}
                    onClick={() => handleItemClick(item)}>
                    {MENU_ITEM_LABELS[item]}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {description && (
        <p className={presentation.tone === "error" ? "chdist-card__reason" : "chdist-card__meta"}>{description}</p>
      )}
    </div>
  );
}

ChannexStatusCard.propTypes = {
  status: PropTypes.shape({
    status: PropTypes.string.isRequired,
    displayName: PropTypes.string,
  }).isRequired,
  onReconnectClick: PropTypes.func.isRequired,
  onDisconnectClick: PropTypes.func.isRequired,
  manageEnabled: PropTypes.bool,
};

export default ChannexStatusCard;
