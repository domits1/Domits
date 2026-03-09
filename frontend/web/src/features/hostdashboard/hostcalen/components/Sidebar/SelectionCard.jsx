import React from "react";
import PropTypes from "prop-types";

export default function SelectionCard({
  selectedCount,
  allSelectedAvailable,
  onToggleAvailability,
  priceInputValue,
  onPriceInputChange,
  showSavePrice,
  canSavePrice,
  onSavePrice,
}) {
  const safeSelectedCount = Math.max(1, Number(selectedCount) || 1);
  const selectionLabel =
    safeSelectedCount === 1 ? "1 day selected" : `${safeSelectedCount} days selected`;

  return (
    <section className="hc-selection-card" aria-label="Selected dates settings">
      <div className="hc-selection-row">
        <div>
          <h3 className="hc-selection-title">Available</h3>
          <p className="hc-selection-subtitle">{selectionLabel}</p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={allSelectedAvailable}
          className={`hc-switch ${allSelectedAvailable ? "is-on" : ""}`}
          onClick={() => onToggleAvailability?.(!allSelectedAvailable)}
        >
          <span className="hc-switch-knob" />
        </button>
      </div>

      <div className="hc-selection-divider" />

      <div className="hc-selection-row hc-selection-row--stacked">
        <p className="hc-selection-title">Price</p>
        <div className="hc-selection-price-row">
          <span className="hc-selection-price-prefix">EUR</span>
          <input
            type="number"
            min="0"
            step="10"
            className="hc-selection-price-input"
            value={priceInputValue}
            onChange={(event) => onPriceInputChange?.(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") {
                return;
              }
              event.preventDefault();
              if (canSavePrice) {
                onSavePrice?.();
              }
            }}
            placeholder="Set price"
          />
        </div>
        {showSavePrice ? (
          <button
            type="button"
            className="hc-selection-save-btn"
            onClick={onSavePrice}
            disabled={!canSavePrice}
          >
            Save
          </button>
        ) : null}
      </div>
    </section>
  );
}

SelectionCard.propTypes = {
  selectedCount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  allSelectedAvailable: PropTypes.bool,
  onToggleAvailability: PropTypes.func,
  priceInputValue: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onPriceInputChange: PropTypes.func,
  showSavePrice: PropTypes.bool,
  canSavePrice: PropTypes.bool,
  onSavePrice: PropTypes.func,
};
