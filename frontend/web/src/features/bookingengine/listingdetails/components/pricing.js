import React from "react";

const Pricing = ({ pricing, nights }) => {
  return (
    <div className="pricing-container">
      <div className="pricing-description-and-price">
        <div className="pricing-description">Host price:</div>
        <div className="pricing-price">
          € &nbsp;{nights * pricing.roomRate + (pricing.roomRate + pricing.cleaning) * nights * 0.1}
        </div>
      </div>
      <hr />
      <div className="pricing-description-and-price">
        <div className="pricing-description">
          <strong>Cleaning fee</strong>
        </div>
      </div>
      <div className="pricing-description-and-price">
        <div className="pricing-description">
          {nights} night{nights > 1 ? "s" : ""} x ${pricing.cleaning} a night
        </div>
        <div className="pricing-price">€ &nbsp; {pricing.cleaning * nights}</div>
      </div>
      <hr />
      <div className="pricing-description-and-price">
        <div className="pricing-description">
          <h2>Total</h2>
        </div>
        <div className="pricing-price">
          <h2>
            € &nbsp;
            {(
              nights * pricing.roomRate +
              (pricing.roomRate + pricing.cleaning) * nights * 0.1 +
              pricing.cleaning * nights
            ).toFixed(2)}
          </h2>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
