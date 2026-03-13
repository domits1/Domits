import React from "react";
import PropTypes from "prop-types";
import { getListingPricingBreakdown } from "../utils/pricing";

const EURO_SYMBOL = "\u20AC";
const formatEuro = (value) => `${EURO_SYMBOL}${value.toFixed(2)}`;

const Pricing = ({ pricing, nights }) => {
  const {
    nights: normalizedNights,
    roomSubtotal,
    cleaningRate,
    cleaningSubtotal,
    serviceFee,
    total,
  } = getListingPricingBreakdown(pricing, nights || 1);

  return (
    <div className="pricing-container">
      <div className="pricing-description-and-price">
        <div className="pricing-description">Host price</div>
        <div className="pricing-price">{formatEuro(roomSubtotal + serviceFee)}</div>
      </div>
      <hr />
      <div className="pricing-description-and-price">
        <div className="pricing-description">
          <strong>Cleaning fee</strong>
        </div>
      </div>
      <div className="pricing-description-and-price">
        <div className="pricing-description">
          {normalizedNights} night{normalizedNights > 1 ? "s" : ""} x {formatEuro(cleaningRate)} a night
        </div>
        <div className="pricing-price">{formatEuro(cleaningSubtotal)}</div>
      </div>
      <hr />
      <div className="pricing-description-and-price">
        <div className="pricing-description">
          <h2>Total</h2>
        </div>
        <div className="pricing-price">
          <h2>{formatEuro(total)}</h2>
        </div>
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

Pricing.defaultProps = {
  pricing: {},
  nights: 1,
};

export default Pricing;
