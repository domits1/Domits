import React from "react";
import PropTypes from "prop-types";
import { getListingPricingBreakdown } from "../utils/pricing";

const EURO_SYMBOL = "\u20AC";
const fmt = (value) => `${EURO_SYMBOL}${Number(value).toFixed(2)}`;

const Pricing = ({ pricing = {}, nights = 1 }) => {
  const {
    roomRate,
    nights: normalizedNights,
    roomSubtotal,
    cleaningSubtotal,
    serviceFee,
    total,
  } = getListingPricingBreakdown(pricing, nights || 1);

  const rows = [
    {
      label: `${fmt(roomRate)} \u00D7 ${normalizedNights} night${normalizedNights === 1 ? "" : "s"}`,
      value: fmt(roomSubtotal),
      amount: Number(roomSubtotal),
    },
    { label: "Cleaning", value: fmt(cleaningSubtotal), amount: Number(cleaningSubtotal) },
    { label: "Service fee", value: fmt(serviceFee), amount: Number(serviceFee) },
  ].filter((row) => row.amount === undefined || (Number.isFinite(row.amount) && row.amount > 0));

  return (
    <div className="pricing-container">
      {rows.map((row) => (
        <div key={row.label} className="pricing-row">
          <span className="pricing-row__label">{row.label}</span>
          <span className="pricing-row__value">{row.value}</span>
        </div>
      ))}
      <div className="pricing-row pricing-row--total">
        <span className="pricing-row__label">Total</span>
        <span className="pricing-row__value">{fmt(total)}</span>
      </div>
    </div>
  );
};

Pricing.propTypes = {
  pricing: PropTypes.shape({
    roomRate: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    cleaning: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }),
  nights: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default Pricing;
