import React from "react";

const Pricing = ({ pricing, nights, priceData }) => {
  
  if (priceData && nights > 0) {
      const total = priceData.totalPriceCents / 100;
      const cleaning = priceData.breakdown?.cleaningCents / 100 || 0;
      const service = priceData.breakdown?.serviceFeeCents / 100 || 0;
      const baseTotal = total - cleaning - service; 
      const ratePerNight = baseTotal / nights;

      return (
        <div className="pricing-container">
          {/* Base Rate */}
          <div className="pricing-description-and-price">
            <div className="pricing-description">
              {nights} night{nights > 1 ? "s" : ""} x ${ratePerNight.toFixed(2)} a night
            </div>
            <div className="pricing-price">${baseTotal.toFixed(2)}</div>
          </div>
          <hr />
          
          {/* Cleaning */}
          <div className="pricing-description-and-price">
            <div className="pricing-description"><strong>Cleaning fee</strong></div>
          </div>
          <div className="pricing-description-and-price">
            <div className="pricing-description">One-time fee</div>
            <div className="pricing-price">${cleaning.toFixed(2)}</div>
          </div>
          <hr />

          {/* Service Fee */}
          <div className="pricing-description-and-price">
            <div className="pricing-description"><strong>Domits service fee</strong></div>
          </div>
          <div className="pricing-description-and-price">
            <div className="pricing-description">Service fee</div>
            <div className="pricing-price">${service.toFixed(2)}</div>
          </div>

          {/* TOTAL */}
          <div className="pricing-description-and-price">
            <div className="pricing-description">
              <h2>Total</h2>
            </div>
            <div className="pricing-price">
              <h2>${total.toFixed(2)}</h2>
            </div>
          </div>
          
          <div style={{fontSize: '10px', color: 'gray', textAlign: 'right'}}>
              Calculated by Backend
          </div>
        </div>
      );
  }

  if (!nights || nights < 1) return null;

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
          <h2>Total (Est.)</h2>
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