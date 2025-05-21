import React from 'react';

export default function PricingTableView({
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
    <div className="pricing-table-view">
      <table className="pricing-table">
        <thead>
          <tr>
            <th className="pricing-table-title">Title</th>
            <th>Country</th>
            <th className="pricing-table-guestAmount">Guests</th>
            <th>Rate</th>
            <th>Cleaning Fee</th>
            <th>Availability</th>
            <th>Tax & Fees</th>
          </tr>
        </thead>
        <tbody>
          {currentAccommodations.map((accommodation, index) => {
            const globalIndex = startIndex + index;
            const extraServices = accommodation.Features?.M?.ExtraServices?.L || [];
            const cleaningFeeIncluded = extraServices.some(
              service => service.S === 'Cleaning service (add service fee manually)'
            );

            return (
              <tr key={globalIndex}>
                <td className="pricing-table-title">{accommodation.Title.S}</td>
                <td>{accommodation.Country.S}</td>
                <td>{accommodation.GuestAmount.N}</td>
                <td>
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
                </td>
                <td>
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
                </td>
                <td>{accommodation.Drafted.BOOL ? 'Unavailable' : 'Available'}</td>
                <td>
                  <button
                    onClick={() => toggleTaxFeePopup(accommodation)}
                    style={{ background: 'none', border: 'none' }}
                  >
                    Tax & Fee
                  </button>
                  {/* Of <img src={taxFeeIcon} alt="Tax & Fee" onClick={...} /> */}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
