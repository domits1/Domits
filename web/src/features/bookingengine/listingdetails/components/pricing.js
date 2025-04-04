import React from "react";

const Pricing = ({pricing}) => {
  return (
    <p className="price">
      ${pricing.roomRate} <span className="price-night">/ night</span>
    </p>
  );
};

export default Pricing;