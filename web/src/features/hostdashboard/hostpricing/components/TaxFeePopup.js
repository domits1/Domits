import React from 'react';

export default function TaxFeePopup({ taxFeeData, onClose }) {
  const {
    rent,
    cleaningFee,
    domitsFee,
    vatTax,
    touristTaxVal,
    totalCost,
    countryVAT
  } = taxFeeData;

  return (
    <div className="pricing-taxFee-popup-container">
      <div className="pricing-taxFee-popup-overlay" onClick={onClose}></div>
      <div className="pricing-taxFee-popup-content">
        <div className="pricing-taxFee-popup-header">
          <h3>Estimate Costs</h3>
          <button className="pricing-taxFee-popup-close-button" onClick={onClose}>
            ✖
          </button>
        </div>
        <div className="pricing-taxFee-popup-body">
          <p>Rates per night: <span>€{rent}</span></p>
          <p>Cleaning fee: <span>€{cleaningFee}</span></p>
          <p>Domits Service fee 15%: <span>€{domitsFee}</span></p>
          <p>VAT Tax ({countryVAT}%): <span>€{vatTax}</span></p>
          <p>Tourist Tax: <span>€{touristTaxVal}</span></p>
          <hr />
          <p>Total Cost: <span>€{totalCost}</span></p>
        </div>
      </div>
    </div>
  );
}
