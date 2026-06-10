import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import arrowRightIcon from "../../../../../images/arrow-right-icon.svg";

const actionButtons = (label, dateKeys, onApplyPrice, onIgnorePrice) => (
  <div className="hc-dynamic-pricing-actions">
    <button
      type="button"
      className="hc-dynamic-pricing-apply-btn"
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

const renderPricingContent = ({
  hasAnySuggestion,
  recommendedPrice,
  hasAnyApplied,
  appliedPrice,
  hasAnyIgnored,
  multipleSelected,
  appliedCount,
  ignoredCount,
  selectedDateKeys,
  onApplyPrice,
  onIgnorePrice,
}) => {
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
  if (hasAnyApplied) {
    return (
      <>
        <p className="hc-info-card-line hc-info-card-line--applied">
          ✓ Dynamic pricing active
        </p>
        {!multipleSelected && appliedPrice !== null && (
          <p className="hc-dynamic-pricing-amount hc-dynamic-pricing-amount--applied">
            EUR {appliedPrice.toFixed(2)}
          </p>
        )}
        {multipleSelected && (
          <p className="hc-info-card-line" style={{ fontSize: "0.78rem", color: "#2e7d32" }}>
            {appliedCount} {appliedCount === 1 ? "day" : "days"} with applied price
          </p>
        )}
      </>
    );
  }
  if (hasAnyIgnored) {
    return (
      <>
        <p className="hc-info-card-line hc-info-card-line--ignored">
          ✗ Suggestion ignored
        </p>
        {multipleSelected && (
          <p className="hc-info-card-line" style={{ fontSize: "0.78rem", color: "#6b7280" }}>
            {ignoredCount} {ignoredCount === 1 ? "day" : "days"} ignored
          </p>
        )}
        <p className="hc-info-card-line" style={{ fontSize: "0.78rem", color: "#aaa" }}>
          Your own price will be used
        </p>
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
  priceLabsApplied,
  priceLabsIgnored,
  onApplyPrice,
  onIgnorePrice,
  onOpenSettings,
}) {
  const [status, setStatus] = useState(null);

  const selectionKey = Array.isArray(selectedDateKeys) ? selectedDateKeys.join(",") : "";
  useEffect(() => {
    setStatus(null);
  }, [selectionKey]);

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

  const appliedPrice =
    !multipleSelected && firstDateKey && Number(priceLabsApplied?.[firstDateKey]) > 0
      ? Number(priceLabsApplied[firstDateKey])
      : null;

  const appliedCount = Array.isArray(selectedDateKeys)
    ? selectedDateKeys.filter((key) => Number(priceLabsApplied?.[key]) > 0).length
    : 0;

  const hasAnyApplied = appliedCount > 0;

  const ignoredCount = Array.isArray(selectedDateKeys)
    ? selectedDateKeys.filter((key) => priceLabsIgnored?.[key]).length
    : 0;

  const hasAnyIgnored = ignoredCount > 0;

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
    const handleApply = (keys) => {
      onApplyPrice?.(keys);
      setStatus("applied");
    };
    const handleIgnore = (keys) => {
      onIgnorePrice?.(keys);
      setStatus("declined");
    };

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

        {status === "applied" && (
          <p className="hc-dynamic-pricing-status hc-dynamic-pricing-status--applied">
            ✓ Dynamic pricing applied
          </p>
        )}
        {status === "declined" && (
          <p className="hc-dynamic-pricing-status hc-dynamic-pricing-status--declined">
            ✗ Suggestion declined
          </p>
        )}
        {!status && renderPricingContent({
          hasAnySuggestion,
          recommendedPrice,
          hasAnyApplied,
          appliedPrice,
          hasAnyIgnored,
          multipleSelected,
          appliedCount,
          ignoredCount,
          selectedDateKeys,
          onApplyPrice: handleApply,
          onIgnorePrice: handleIgnore,
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
  onOpenSettings: PropTypes.func,
};

DynamicPricingCard.defaultProps = {
  selectedDateKeys: [],
  priceLabsOverrides: {},
  priceLabsApplied: {},
  priceLabsIgnored: {},
  onApplyPrice: () => {},
  onIgnorePrice: () => {},
  onOpenSettings: () => {},
};
