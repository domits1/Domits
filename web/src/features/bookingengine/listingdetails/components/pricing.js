const Pricing = ({ pricing, nights }) => {
  return (
    <div className="pricing-container">
      <div className="pricing-description-and-price">
        <div className="pricing-description">
          {nights} night{nights > 1 ? "s" : ""} x ${pricing.roomRate} a night
        </div>
        <div className="pricing-price">${nights * pricing.roomRate}</div>
      </div>
      <div className="pricing-description-and-price">
        <div className="pricing-description">Cleaning fee</div>
        <div className="pricing-price">${pricing.cleaning}</div>
      </div>
      <div className="pricing-description-and-price">
        <div className="pricing-description">Domits service fee</div>
        <div className="pricing-price">${pricing.service}</div>
      </div>
      <div className="pricing-description-and-price">
        <div className="pricing-description">
          <h2>Total</h2>
        </div>
        <div className="pricing-price">
          <h2>
            ${nights * pricing.roomRate + pricing.cleaning + pricing.service}
          </h2>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
