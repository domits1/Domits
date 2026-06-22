import React from "react";
import PropTypes from "prop-types";
import arrowRightIcon from "../../../../../images/arrow-right-icon.svg";

const actionButtons = (label, dateKeys, onApplyPrice, onIgnorePrice) => (
  <div className="hc-dynamic-pricing-actions" style={{ position: "relative", zIndex: 4, display: "flex", gap: "8px" }}>
    <button
      type="button"
      className="hc-dynamic-pricing-apply-btn"
      style={{ flex: 1 }}
      onClick={(e) => { e.stopPropagation(); onApplyPrice?.(dateKeys); }}
    >
      {label}
    </button>
    <button
      type="button"
      className="hc-dynamic-pricing-ignore-btn"
      onClick={(e) => { e.stopPropagation(); onIgnorePrice?.(dateKeys); }}
    >
      Ignore
    </button>
  </div>
);

const undoButton = (dateKeys, onUndoPrice) => (
  <div className="hc-dynamic-pricing-actions" style={{ position: "relative", zIndex: 4, display: "flex" }}>
    <button
      type="button"
      className="hc-dynamic-pricing-undo-btn"
      style={{ flex: 1 }}
      onClick={(e) => { e.stopPropagation(); onUndoPrice?.(dateKeys); }}
    >
      Undo
    </button>
  </div>
);

const renderPricingContent = ({
  hasAnySuggestion,
  recommendedPrice,
  hasAnyApplied,
  hasAnyIgnored,
  selectedDateKeys,
  onApplyPrice,
  onIgnorePrice,
  onUndoPrice,
}) => {
  // 1. Active suggestion takes priority
  if (hasAnySuggestion) {
    return (
      <>
        <p className="hc-info-card-line">{`PriceLabs suggestions for ${selectedDateKeys.length} days`}</p>
        {actionButtons("Apply prices", selectedDateKeys, onApplyPrice, onIgnorePrice)}
      </>
    );
  }
  if (recommendedPrice !== null) {
    return (
      <>
        <p className="hc-info-card-line">PriceLabs suggested price</p>
        <p className="hc-dynamic-pricing-amount">EUR {recommendedPrice.toFixed(2)}</p>
        {actionButtons("Apply price", selectedDateKeys, onApplyPrice, onIgnorePrice)}
      </>
    );
  }
  // 2. Applied state
  if (hasAnyApplied) {
    return (
      <>
        <p className="hc-info-card-line hc-info-card-line--applied">Price applied</p>
        <p className="hc-info-card-line" style={{ fontSize: "0.78rem", color: "#aaa" }}>
          PriceLabs price is active
        </p>
        {undoButton(selectedDateKeys, onUndoPrice)}
      </>
    );
  }
  // 3. Ignored state
  if (hasAnyIgnored) {
    return (
      <>
        <p className="hc-info-card-line hc-info-card-line--ignored">Suggestion ignored</p>
        <p className="hc-info-card-line" style={{ fontSize: "0.78rem", color: "#aaa" }}>
          Your own price is active
        </p>
        {undoButton(selectedDateKeys, onUndoPrice)}
      </>
    );
  }
  // 4. No suggestion
  return (
    <>
      <p className="hc-info-card-line">No suggestion for this day</p>
      <p className="hc-info-card-line" style={{ fontSize: "0.78rem", color: "#aaa" }}>
        Sync data to receive recommendations
      </p>
    </>
  );
};

export default function DynamicPricingCard({
  isConnected,
  selectedDateKeys,
  priceLabsOverrides,
  priceLabsApplied,
  priceLabsIgnored,
  onApplyPrice,
  onIgnorePrice,
  onUndoPrice,
  onOpenSettings,
}) {
  const firstDateKey = selectedDateKeys?.[0];
  const multipleSelected = selectedDateKeys?.length > 1;

  const recommendedPrice =
    !multipleSelected && firstDateKey && priceLabsOverrides && Number(priceLabsOverrides[firstDateKey]) > 0
      ? Number(priceLabsOverrides[firstDateKey])
      : null;

  const hasAnySuggestion =
    multipleSelected &&
    Array.isArray(selectedDateKeys) &&
    selectedDateKeys.some((key) => Number(priceLabsOverrides?.[key]) > 0);

  const hasAnyApplied =
    Array.isArray(selectedDateKeys) &&
    selectedDateKeys.some((key) => priceLabsApplied?.[key]);

  const hasAnyIgnored =
    Array.isArray(selectedDateKeys) &&
    selectedDateKeys.some((key) => priceLabsIgnored?.[key]);

  if (!isConnected) {
    return (
      <section className="hc-info-card hc-info-card--interactive">
        <button
          type="button"
          className="hc-info-card-hitarea"
          aria-label="Connect PriceLabs for dynamic pricing"
          onClick={() => onOpenSettings?.()}
        />
        <header className="hc-info-card-header">
          <h3 className="hc-info-card-title">Dynamic Pricing</h3>
          <span className="hc-info-card-chevron" aria-hidden="true">
            <img src={arrowRightIcon} alt="" aria-hidden="true" className="hc-chevron-icon" />
          </span>
        </header>
        <p className="hc-info-card-line">Connect PriceLabs to enable</p>
        <p className="hc-info-card-line">automatic price recommendations</p>
      </section>
    );
  }

  if (selectedDateKeys?.length > 0) {
    return (
      <section className="hc-info-card hc-info-card--interactive hc-dynamic-pricing-card">
        <button
          type="button"
          className="hc-info-card-hitarea"
          aria-label="Open PriceLabs dynamic pricing settings"
          onClick={() => onOpenSettings?.()}
        />
        <header className="hc-info-card-header">
          <h3 className="hc-info-card-title">Dynamic Pricing</h3>
          <span className="hc-dynamic-pricing-badge">Active</span>
          <span className="hc-info-card-chevron" aria-hidden="true">
            <img src={arrowRightIcon} alt="" aria-hidden="true" className="hc-chevron-icon" />
          </span>
        </header>

        {renderPricingContent({
          hasAnySuggestion,
          recommendedPrice,
          hasAnyApplied,
          hasAnyIgnored,
          selectedDateKeys,
          onApplyPrice,
          onIgnorePrice,
          onUndoPrice,
        })}
      </section>
    );
  }

  return (
    <section className="hc-info-card hc-info-card--interactive">
      <button
        type="button"
        className="hc-info-card-hitarea"
        aria-label="Open PriceLabs dynamic pricing settings"
        onClick={() => onOpenSettings?.()}
      />
      <header className="hc-info-card-header">
        <h3 className="hc-info-card-title">Dynamic Pricing</h3>
        <span className="hc-info-card-chevron" aria-hidden="true">
          <img src={arrowRightIcon} alt="" aria-hidden="true" className="hc-chevron-icon" />
        </span>
      </header>
      <p className="hc-info-card-line">PriceLabs connected</p>
      <p className="hc-info-card-line">Select a day to see suggestions</p>
    </section>
  );
}

DynamicPricingCard.propTypes = {
  isConnected: PropTypes.bool.isRequired,
  selectedDateKeys: PropTypes.arrayOf(PropTypes.string),
  priceLabsOverrides: PropTypes.object,
  priceLabsApplied: PropTypes.object,
  priceLabsIgnored: PropTypes.object,
  onApplyPrice: PropTypes.func,
  onIgnorePrice: PropTypes.func,
  onUndoPrice: PropTypes.func,
  onOpenSettings: PropTypes.func,
};

DynamicPricingCard.defaultProps = {
  selectedDateKeys: [],
  priceLabsOverrides: {},
  priceLabsApplied: {},
  priceLabsIgnored: {},
  onApplyPrice: () => {},
  onIgnorePrice: () => {},
  onUndoPrice: () => {},
  onOpenSettings: () => {},
};
