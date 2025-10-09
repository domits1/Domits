import React from "react";

const Pricing = ({ pricing, nights }) => {
  return (
    <div className="pricing-container">
      <div className="pricing-description-and-price">
        <div className="pricing-description">
          {nights} night{nights > 1 ? "s" : ""} x ${pricing.roomRate} a night
        </div>
        <div className="pricing-price">${nights * pricing.roomRate}</div>
      </div>
      <hr />
      <div className="pricing-description-and-price">
        <div className="pricing-description"><strong>Cleaning fee</strong></div>
      </div>
      <div className="pricing-description-and-price">
        <div className="pricing-description">{nights} night{nights > 1 ? "s" : ""} x ${pricing.cleaning} a night</div>
        <div className="pricing-price">${pricing.cleaning * nights}</div>
      </div>
      <hr />
      <div className="pricing-description-and-price">
        <div className="pricing-description"><strong>Domits service fee</strong></div>
      </div>
      <div className="pricing-description-and-price">
        <div className="pricing-description">10% x ${pricing.roomRate} a night</div>
        <div className="pricing-price">${pricing.roomRate * 0.10 * nights}</div>
      </div>
      <div className="pricing-description-and-price">
        <div className="pricing-description">
          <h2>Total</h2>
        </div>
        <div className="pricing-price">
          <h2>
            ${(pricing.roomRate * 1.10 * nights + pricing.cleaning * nights).toFixed(2)}
          </h2>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
