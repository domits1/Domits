import React from "react";

const Pricing = ({ pricing, nights, guests = 1, checkInDate, checkOutDate, dynamicPrices = {} }) => {
  // Base occupancy and extra guest fee
  const baseOccupancy = 2;
  const extraGuestFee = 20;
  const extraGuests = Math.max(0, guests - baseOccupancy);

  // Calculate dynamic room rate from date range
  const calculateDynamicRoomTotal = () => {
    if (!checkInDate || !checkOutDate || Object.keys(dynamicPrices).length === 0) {
      // Fallback to static pricing if no dynamic prices available
      return nights * pricing.roomRate;
    }

    let total = 0;
    let count = 0;
    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);

    // Iterate through each night in the date range
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      const priceForDate = dynamicPrices[dateKey];

      if (priceForDate !== undefined && priceForDate !== null) {
        total += Number(priceForDate);
        count++;
      } else {
        // Fallback to base room rate for dates without dynamic pricing
        total += pricing.roomRate;
        count++;
      }
    }

    return total;
  };

  // Calculate base room rate (using dynamic pricing if available)
  const baseRoomTotal = calculateDynamicRoomTotal();

  // Calculate extra guest charges
  const extraGuestTotal = extraGuests * extraGuestFee * nights;

  // Total room charges (base + extra guests)
  const totalRoomCharges = baseRoomTotal + extraGuestTotal;

  // Host price with 10% commission
  const hostPrice = totalRoomCharges + (baseRoomTotal / nights + pricing.cleaning) * nights * 0.1;

  // Cleaning fee
  const cleaningTotal = pricing.cleaning * nights;

  // Grand total
  const total = totalRoomCharges + (baseRoomTotal / nights + pricing.cleaning) * nights * 0.1 + cleaningTotal;

  return (
    <div className="pricing-container">
      <div className="pricing-description-and-price">
        <div className="pricing-description">Host price:</div>
        <div className="pricing-price">
          € &nbsp;{nights * pricing.roomRate + (pricing.roomRate + pricing.cleaning) * nights * 0.1}
        </div>
      </div>
      {extraGuests > 0 && (
        <div className="pricing-description-and-price">
          <div className="pricing-description">
            Extra guest fee ({extraGuests} guest{extraGuests > 1 ? 's' : ''} x {nights} night{nights > 1 ? 's' : ''}):
          </div>
          <div className="pricing-price">
            € &nbsp;{extraGuestTotal.toFixed(2)}
          </div>
        </div>
      )}
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
