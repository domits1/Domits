import React from 'react';

export default function PricingDetailsView({
  currentAccommodations,
  startIndex,
  editMode,
  editedRates,
  editedCleaningFees,
  handleRateChange,
  handleCleaningFeeChange,
  toggleTaxFeePopup,
  openModal
}) {
  return (
    <div className="pricing-details-view">
      <div className="accommodation-cards">
        {currentAccommodations.map((accommodation, index) => {
          const globalIndex = startIndex + index;
          const extraServices = accommodation.Features?.M?.ExtraServices?.L || [];
          const cleaningFeeIncluded = extraServices.some(
            service => service.S === 'Cleaning service (add service fee manually)'
          );

          return (
            <div key={globalIndex} className="accommodation-card">
              <img
                className="accommodation-card-img"
                src={accommodation.Images.M.image1.S}
                alt="Accommodation"
              />
              <div className="accommodation-card-details">
                <div className="pricing-column">
                  <p className="pricing-title">{accommodation.Title.S}</p>
                  <p>{accommodation.Country.S}</p>
                  <p>Guests: {accommodation.GuestAmount.N}</p>
                </div>

                <div className="pricing-column">
                  <p className="pricing-rate-input">
                    Rate:{' '}
                    {editMode ? (
                      <input
                        type="number"
                        step="0.1"
                        value={editedRates[globalIndex] || ''}
                        onChange={(e) => handleRateChange(e, globalIndex)}
                      />
                    ) : (
                      editedRates[globalIndex] ||
                      (accommodation.Rent.N || accommodation.Rent.S)
                    )}
                  </p>

                  <button
                    className="dynamic-pricing-button"
                    onClick={() => openModal(accommodation)}
                  >
                    Configure Dynamic Pricing
                  </button>

                  <p className="pricing-rate-input">
                    Cleaning Fee:{' '}
                    {cleaningFeeIncluded ? (
                      editMode ? (
                        <input
                          type="number"
                          step="0.1"
                          value={editedCleaningFees[globalIndex] || ''}
                          onChange={(e) => handleCleaningFeeChange(e, globalIndex)}
                        />
                      ) : (
                        editedCleaningFees[globalIndex] ||
                        (accommodation.CleaningFee.N || accommodation.CleaningFee.S)
                      )
                    ) : (
                      0
                    )}
                  </p>
                  <p>Availability: {accommodation.Drafted.BOOL ? 'Unavailable' : 'Available'}</p>
                </div>
              </div>
              <div className="pricing-taxFee-container">
                <button
                  onClick={() => toggleTaxFeePopup(accommodation)}
                  style={{ background: 'none', border: 'none' }}
                >
                  Tax & Fee
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
