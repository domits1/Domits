import React from 'react';
import PropTypes from 'prop-types';
import { vatRates, touristTaxRates } from '../../../../utils/CountryVATRatesAndTouristTaxes';

const TaxFeePopup = ({ accommodation, onClose, editedRates, editedCleaningFees, index }) => {
  const countryVAT = vatRates.find(rate => rate.country === accommodation.Country?.S)?.vat || "0";
  const vatRate = Number.parseFloat(countryVAT) / 100;
  const countryTouristTax = touristTaxRates.find(rate => rate.country === accommodation.Country?.S)?.touristTax || "0";

  const rent = Number.parseFloat(
    editedRates[index] || accommodation.Rent?.N || accommodation.Rent?.S || 0
  ).toFixed(2);

  const cleaningFee = Number.parseFloat(
    editedCleaningFees[index] || accommodation.CleaningFee?.N || accommodation.CleaningFee?.S || 0
  ).toFixed(2);

  const domitsFee = (Number.parseFloat(rent) * 0.15).toFixed(2);
  const vatTax = (Number.parseFloat(rent) * vatRate).toFixed(2);

  let touristTax;
  if (countryTouristTax.includes('%')) {
    const taxRate = Number.parseFloat(countryTouristTax.replace('%', '')) / 100;
    touristTax = (Number.parseFloat(rent) * taxRate).toFixed(2);
  } else if (
    countryTouristTax.includes('EUR') ||
    countryTouristTax.includes('USD') ||
    countryTouristTax.includes('GBP')
  ) {
    touristTax = Number.parseFloat(countryTouristTax.replace(/[^\d.]/g, '') || 0).toFixed(2);
  } else {
    touristTax = "0.00";
  }

  const totalCost = (
    Number.parseFloat(rent) +
    Number.parseFloat(cleaningFee) +
    Number.parseFloat(domitsFee) +
    Number.parseFloat(vatTax) +
    Number.parseFloat(touristTax)
  ).toFixed(2);

  return (
    <div className="pricing-taxFee-popup-container">
      <div className="pricing-taxFee-popup-overlay" onClick={onClose}></div>
      <div className="pricing-taxFee-popup-content">
        <div className="pricing-taxFee-popup-header">
          <h3>Estimate Costs</h3>
          <button 
            className="pricing-taxFee-popup-close-button" 
            onClick={onClose}
            aria-label="Close popup"
          >
            ✖
          </button>
        </div>
        <div className="pricing-taxFee-popup-body">
          <p>Rates per night: <span>€{rent}</span></p>
          <p>Cleaning fee: <span>€{cleaningFee}</span></p>
          <p>Domits Service fee 15%: <span>€{domitsFee}</span></p>
          <p>VAT Tax ({countryVAT}%): <span>€{vatTax}</span></p>
          <p>Tourist Tax: <span>€{touristTax}</span></p>
          <hr />
          <p>Total Cost: <span>€{totalCost}</span></p>
        </div>
      </div>
    </div>
  );
};

TaxFeePopup.propTypes = {
  accommodation: PropTypes.shape({
    Country: PropTypes.shape({
      S: PropTypes.string
    }),
    Rent: PropTypes.shape({
      N: PropTypes.string,
      S: PropTypes.string
    }),
    CleaningFee: PropTypes.shape({
      N: PropTypes.string,
      S: PropTypes.string
    })
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  editedRates: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])).isRequired,
  editedCleaningFees: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])).isRequired,
  index: PropTypes.number.isRequired
};

export default TaxFeePopup;
