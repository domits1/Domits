import React from "react";

const PricingPerNight = ({pricing}) => {
  return (
    <p className="price">
      €{pricing.roomRate} <span className="price-night">/ night</span>
    </p>
  );
};

export default PricingPerNight;