import React, { useState } from 'react';
import Pages from "../../Pages.js";
import "../styles/HostPricing.css";
import detailsIcon from "../../../../images/icons/content-view-detail-list-icon.svg";
import tableIcon from "../../../../images/icons/content-view-table-list-icon.svg";
import spinner from "../../../../images/spinnner.gif";
import taxFeeIcon from "../../../../images/icons/tax-fee-icon.png";

import { useAccommodations } from '../hooks/useAccommodations';
import { useDynamicPricing } from '../hooks/useDynamicPricing';
import { usePagination } from '../hooks/usePagination';

import PriceInput from '../components/PriceInput';
import TaxFeePopup from '../components/TaxFeePopup';
import DynamicPricingModal from '../components/DynamicPricingModal';

const HostPricing = () => {
  const [viewMode, setViewMode] = useState('details');
  const [editMode, setEditMode] = useState(false);
  const [taxFeePopup, setTaxFeePopup] = useState(false);
  const [selectedAccommodation, setSelectedAccommodation] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    accommodations,
    isLoading,
    error,
    editedRates,
    editedCleaningFees,
    handleRateChange,
    handleCleaningFeeChange,
    handleSaveRates,
    handleUndo,
    fetchAccommodations
  } = useAccommodations();

  const {
    priceHistory,
    basePrice,
    initializeDynamicPricing,
    updateBasePrice,
    setPriceHistory
  } = useDynamicPricing();

  const itemsPerPage = viewMode === 'details' ? 3 : 7;
  const {
    currentPage,
    totalPages,
    paginatedItems,
    pageRange,
    goToPage,
    goToNextPage,
    goToPreviousPage
  } = usePagination(accommodations, itemsPerPage);

  const toggleView = (mode) => {
    setViewMode(mode);
    goToPage(1);
  };

  const handleDetailsView = () => toggleView('details');
  const handleTableView = () => toggleView('table');

  const toggleTaxFeePopup = (accommodation) => {
    setSelectedAccommodation(accommodation);
    setTaxFeePopup(!taxFeePopup);
  };

  const handleClosePopUp = () => setTaxFeePopup(false);

  const openModal = async (accommodation) => {
    setSelectedAccommodation(accommodation);
    await initializeDynamicPricing(accommodation);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedAccommodation(null);
  };

  const handlePriceHistoryUpdate = async (updatedPriceHistory) => {
    setPriceHistory(updatedPriceHistory);
  };

  const handleBasePriceChange = async (newPrice) => {
    if (selectedAccommodation) {
      await updateBasePrice(newPrice, selectedAccommodation);
    }
  };

  if (error) {
    return <div className="error-message">Error: {error}</div>;
  }

  return (
    <div className="containerHostPricing">
      <div className="host-pricing-header">
        <h2 className="host-pricing-title">Pricing</h2>
        <div className="host-pricing-header-buttons">
          <button 
            className="refresh-accommodation-button" 
            onClick={fetchAccommodations}
            aria-label="Refresh accommodations"
          >
            Refresh
          </button>

          <div className="pricing-switch-layout-button">
            <button 
              className="details-switch-button" 
              onClick={handleDetailsView}
              aria-label="Switch to details view"
            >
              <img src={detailsIcon} alt="detailsView" />
            </button>
            <button 
              className="table-switch-button" 
              onClick={handleTableView}
              aria-label="Switch to table view"
            >
              <img src={tableIcon} alt="tableView" />
            </button>
          </div>
        </div>
      </div>

      <div className="hostdashboard-container">
        <Pages />

        <div className="host-pricing-container">
          {isLoading ? (
            <div className="loading-container">
              <img src={spinner} alt="Loading..." />
            </div>
          ) : viewMode === 'details' ? (
            <div className="pricing-details-view">
              <div className="accommodation-cards">
                {paginatedItems.map((accommodation, index) => {
                  const globalIndex = (currentPage - 1) * itemsPerPage + index;
                  const extraServices = accommodation.Features?.M?.ExtraServices?.L || [];
                  const cleaningFeeIncluded = extraServices.some(
                    service => service.S === 'Cleaning service (add service fee manually)'
                  );

                  return (
                    <div key={globalIndex} className="accommodation-card">
                      <img
                        className="accommodation-card-img"
                        src={accommodation.Images?.M?.image1?.S}
                        alt={`${accommodation.Title?.S} accommodation`}
                      />
                      <div className="accommodation-card-details">
                        <div className="pricing-column">
                          <p className="pricing-title">{accommodation.Title?.S}</p>
                          <p>{accommodation.Country?.S}</p>
                          <p>Guests: {accommodation.GuestAmount?.N}</p>
                        </div>

                        <div className="pricing-column">
                          <p className="pricing-rate-input">
                            {/* <button
                              className="dynamic-pricing-button"
                              onClick={() => openModal(accommodation)}
                              aria-label="Open dynamic pricing"
                            >
                              Dynamic
                            </button> */}
                            Rate:{' '}
                            {editMode ? (
                              <PriceInput
                                value={editedRates[globalIndex]}
                                onChange={(e) => handleRateChange(globalIndex, e.target.value)}
                                ariaLabel={`Rate for ${accommodation.Title?.S}`}
                              />
                            ) : (
                              editedRates[globalIndex] ||
                              (accommodation.Rent?.N || accommodation.Rent?.S)
                            )}
                          </p>
                          <p className="pricing-rate-input">
                            Cleaning Fee:{' '}
                            {cleaningFeeIncluded ? (
                              editMode ? (
                                <PriceInput
                                  value={editedCleaningFees[globalIndex]}
                                  onChange={(e) => handleCleaningFeeChange(globalIndex, e.target.value)}
                                  ariaLabel={`Cleaning fee for ${accommodation.Title?.S}`}
                                />
                              ) : (
                                editedCleaningFees[globalIndex] ||
                                (accommodation.CleaningFee?.N || accommodation.CleaningFee?.S)
                              )
                            ) : (
                              0
                            )}
                          </p>
                          <p>Availability: {accommodation.Drafted?.BOOL ? 'Unavailable' : 'Available'}</p>
                        </div>
                      </div>
                      <div className="pricing-taxFee-container">
                        <img
                          className="pricing-taxFee-icon-details"
                          src={taxFeeIcon}
                          alt="Tax & Fee Button"
                          onClick={() => toggleTaxFeePopup(accommodation)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
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
                  {paginatedItems.map((accommodation, index) => {
                    const globalIndex = (currentPage - 1) * itemsPerPage + index;
                    const extraServices = accommodation.Features?.M?.ExtraServices?.L || [];
                    const cleaningFeeIncluded = extraServices.some(
                      service => service.S === 'Cleaning service (add service fee manually)'
                    );

                    return (
                      <tr key={globalIndex}>
                        <td className="pricing-table-title">{accommodation.Title?.S}</td>
                        <td>{accommodation.Country?.S}</td>
                        <td>{accommodation.GuestAmount?.N}</td>
                        <td>
                          {editMode ? (
                            <PriceInput
                              value={editedRates[globalIndex]}
                              onChange={(e) => handleRateChange(globalIndex, e.target.value)}
                              ariaLabel={`Rate for ${accommodation.Title?.S}`}
                            />
                          ) : (
                            editedRates[globalIndex] ||
                            (accommodation.Rent?.N || accommodation.Rent?.S)
                          )}
                        </td>
                        <td>
                          {cleaningFeeIncluded ? (
                            editMode ? (
                              <PriceInput
                                value={editedCleaningFees[globalIndex]}
                                onChange={(e) => handleCleaningFeeChange(globalIndex, e.target.value)}
                                ariaLabel={`Cleaning fee for ${accommodation.Title?.S}`}
                              />
                            ) : (
                              editedCleaningFees[globalIndex] ||
                              (accommodation.CleaningFee?.N || accommodation.CleaningFee?.S)
                            )
                          ) : (
                            0
                          )}
                        </td>
                        <td>{accommodation.Drafted?.BOOL ? 'Unavailable' : 'Available'}</td>
                        <td>
                          <img
                            className="pricing-taxFee-icon-table"
                            src={taxFeeIcon}
                            alt="Tax & Fee Button"
                            onClick={() => toggleTaxFeePopup(accommodation)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {taxFeePopup && selectedAccommodation && (
            <TaxFeePopup
              accommodation={selectedAccommodation}
              onClose={handleClosePopUp}
              editedRates={editedRates}
              editedCleaningFees={editedCleaningFees}
              index={accommodations.indexOf(selectedAccommodation)}
            />
          )}

          {isModalOpen && selectedAccommodation && (
            <DynamicPricingModal
              isOpen={isModalOpen}
              onClose={closeModal}
              basePrice={basePrice}
              priceHistory={priceHistory}
              onBasePriceChange={handleBasePriceChange}
              onPriceHistoryUpdate={handlePriceHistoryUpdate}
            />
          )}

          <div className="pricing-bottom-buttons">
            <div className="pricing-navigation-buttons">
              <button
                className="pricing-prev-nav-button"
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                aria-label="Previous page"
              >
                Previous
              </button>
              {[...Array(pageRange.endPage - pageRange.startPage + 1)].map((_, index) => {
                const pageIndex = pageRange.startPage + index;
                return (
                  <button
                    key={pageIndex}
                    className={`pricing-pagenumber-nav-button ${currentPage === pageIndex ? 'active' : ''}`}
                    onClick={() => goToPage(pageIndex)}
                    aria-label={`Go to page ${pageIndex}`}
                  >
                    {pageIndex}
                  </button>
                );
              })}
              <button
                className="pricing-next-nav-button"
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                aria-label="Next page"
              >
                Next
              </button>
            </div>

            <div className="pricing-action-buttons">
              <button 
                onClick={() => setEditMode(!editMode)}
                aria-label={editMode ? "Exit edit mode" : "Enter edit mode"}
              >
                {editMode ? "Cancel" : "Edit"}
              </button>
              <button 
                onClick={handleUndo}
                disabled={!editMode}
                aria-label="Undo changes"
              >
                Undo
              </button>
              <button 
                className="pricing-action-save" 
                onClick={handleSaveRates}
                disabled={!editMode}
                aria-label="Save changes"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostPricing;
