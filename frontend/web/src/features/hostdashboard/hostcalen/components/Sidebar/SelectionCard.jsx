import React from "react";
import PropTypes from "prop-types";

const BOOLEAN_RESTRICTION_FIELDS = [
  { field: "stopSell", label: "Stop selling this date" },
  { field: "closedToArrival", label: "No check-in on this date" },
  { field: "closedToDeparture", label: "No check-out on this date" },
];

const DEFAULT_RESTRICTION_FORM = {
  stopSell: "inherit",
  closedToArrival: "inherit",
  closedToDeparture: "inherit",
  minStay: "",
  maxStay: "",
};

export default function SelectionCard({
  selectedCount,
  allSelectedAvailable,
  onToggleAvailability,
  priceInputValue,
  onPriceInputChange,
  showSavePrice,
  canSavePrice,
  onSavePrice,
  restrictionForm,
  restrictionMixedFields,
  onRestrictionFieldChange,
  showSaveRestrictions,
  canSaveRestrictions,
  onSaveRestrictions,
}) {
  const safeSelectedCount = Math.max(1, Number(selectedCount) || 1);
  const selectionLabel =
    safeSelectedCount === 1 ? "1 day selected" : `${safeSelectedCount} days selected`;
  const safeRestrictionForm = { ...DEFAULT_RESTRICTION_FORM, ...(restrictionForm || {}) };
  const safeMixedFields = restrictionMixedFields || {};

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

      <div className="hc-selection-divider" />

      <details className="hc-selection-advanced">
        <summary className="hc-selection-advanced-summary">Advanced restrictions</summary>

        <div className="hc-selection-restrictions">
          {BOOLEAN_RESTRICTION_FIELDS.map(({ field, label }) => {
            const value = safeRestrictionForm[field] || "inherit";
            return (
              <label key={field} className="hc-restriction-field">
                <span className="hc-restriction-label">{label}</span>
                <select
                  className="hc-restriction-select"
                  value={value}
                  onChange={(event) => onRestrictionFieldChange?.(field, event.target.value)}
                >
                  {value === "mixed" ? (
                    <option value="mixed" disabled>
                      Mixed
                    </option>
                  ) : null}
                  <option value="inherit">Inherit</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </label>
            );
          })}

          <label className="hc-restriction-field">
            <span className="hc-restriction-label">Minimum stay</span>
            <input
              type="number"
              min="0"
              step="1"
              className="hc-restriction-input"
              value={safeRestrictionForm.minStay ?? ""}
              placeholder={safeMixedFields.minStay ? "Mixed" : "Inherit"}
              onChange={(event) => onRestrictionFieldChange?.("minStay", event.target.value)}
            />
          </label>

          <label className="hc-restriction-field">
            <span className="hc-restriction-label">Maximum stay</span>
            <input
              type="number"
              min="0"
              step="1"
              className="hc-restriction-input"
              value={safeRestrictionForm.maxStay ?? ""}
              placeholder={safeMixedFields.maxStay ? "Mixed" : "Inherit"}
              onChange={(event) => onRestrictionFieldChange?.("maxStay", event.target.value)}
            />
          </label>

          {showSaveRestrictions ? (
            <button
              type="button"
              className="hc-selection-save-btn"
              onClick={onSaveRestrictions}
              disabled={!canSaveRestrictions}
            >
              Save
            </button>
          ) : null}
        </div>
      </details>
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
  restrictionForm: PropTypes.shape({
    stopSell: PropTypes.string,
    closedToArrival: PropTypes.string,
    closedToDeparture: PropTypes.string,
    minStay: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    maxStay: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  }),
  restrictionMixedFields: PropTypes.shape({
    stopSell: PropTypes.bool,
    closedToArrival: PropTypes.bool,
    closedToDeparture: PropTypes.bool,
    minStay: PropTypes.bool,
    maxStay: PropTypes.bool,
  }),
  onRestrictionFieldChange: PropTypes.func,
  showSaveRestrictions: PropTypes.bool,
  canSaveRestrictions: PropTypes.bool,
  onSaveRestrictions: PropTypes.func,
};
