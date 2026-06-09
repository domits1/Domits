import React from "react";
import PropTypes from "prop-types";
import arrowRightIcon from "../../../../../images/arrow-right-icon.svg";

const actionButtons = (label, dateKeys, onApplyPrice, onIgnorePrice) => (
  <div className="hc-dynamic-pricing-actions" style={{ position: "relative", zIndex: 1, display: "flex", gap: "8px" }}>
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

const renderPricingContent = ({ hasAnySuggestion, recommendedPrice, selectedDateKeys, onApplyPrice, onIgnorePrice }) => {
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
  onApplyPrice,
  onIgnorePrice,
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
          selectedDateKeys,
          onApplyPrice,
          onIgnorePrice,
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
  onApplyPrice: PropTypes.func,
  onIgnorePrice: PropTypes.func,
  onOpenSettings: PropTypes.func,
};

DynamicPricingCard.defaultProps = {
  selectedDateKeys: [],
  priceLabsOverrides: {},
  onApplyPrice: () => {},
  onIgnorePrice: () => {},
  onOpenSettings: () => {},
};
