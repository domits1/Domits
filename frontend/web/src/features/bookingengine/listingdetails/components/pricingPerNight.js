import React from "react";
import PropTypes from "prop-types";
import { getListingPricingBreakdown } from "../utils/pricing";

const EURO_SYMBOL = "\u20AC";
const formatEuro = (value) => `${EURO_SYMBOL}${value.toFixed(2)}`;

const PricingPerNight = ({ pricing }) => {
  const { nightlyDisplayPrice } = getListingPricingBreakdown(pricing, 1);

  return (
    <p className="price">
      {formatEuro(nightlyDisplayPrice)} <span className="price-night">/ night</span>
    </p>
  );
};

PricingPerNight.propTypes = {
  pricing: PropTypes.shape({
    roomRate: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    cleaning: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }),
};

PricingPerNight.defaultProps = {
  pricing: {},
};

export default PricingPerNight;
