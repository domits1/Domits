import React from "react";
import PropTypes from "prop-types";
import arrowRightIcon from "../../../../../images/arrow-right-icon.svg";

export default function DynamicPricingCard({
  isConnected,
  selectedDateKeys,
  priceOverrides,
  onApplyPrice,
  onOpenSettings,
}) {
  const firstDateKey = selectedDateKeys?.[0];
  const multipleSelected = selectedDateKeys?.length > 1;

  const recommendedPrice =
    firstDateKey && priceOverrides && Number(priceOverrides[firstDateKey]) > 0
      ? Number(priceOverrides[firstDateKey])
      : null;

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
      <section className="hc-info-card hc-dynamic-pricing-card">
        <header className="hc-info-card-header">
          <h3 className="hc-info-card-title">Dynamic Pricing</h3>
          <span className="hc-dynamic-pricing-badge">Active</span>
        </header>

        {recommendedPrice == null ? (
          <>
            <p className="hc-info-card-line">No suggestion for this day</p>
            <p className="hc-info-card-line" style={{ fontSize: "0.78rem", color: "#aaa" }}>
              Sync data to receive recommendations
            </p>
          </>
        ) : (
          <>
            <p className="hc-info-card-line">
              {multipleSelected
                ? `PriceLabs suggestion for ${selectedDateKeys.length} days`
                : "PriceLabs suggested price"}
            </p>
            <p className="hc-dynamic-pricing-amount">
              EUR {recommendedPrice.toFixed(2)}
              {multipleSelected ? " avg" : ""}
            </p>
            <button
              type="button"
              className="hc-dynamic-pricing-apply-btn"
              onClick={() => onApplyPrice?.(selectedDateKeys, recommendedPrice)}
            >
              Apply price
            </button>
          </>
        )}
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
  priceOverrides: PropTypes.object,
  onApplyPrice: PropTypes.func,
  onOpenSettings: PropTypes.func,
};

DynamicPricingCard.defaultProps = {
  selectedDateKeys: [],
  priceOverrides: {},
  onApplyPrice: () => {},
  onOpenSettings: () => {},
};
