// FilterUi.jsx
import React from 'react';
import Slider from '@mui/material/Slider';
import { FilterLogic } from './FilterLogic';
import './FilterMain.css';

const FilterUi = () => {
  const {
    priceValues,
    setPriceValues,
    selectedFacilities,
    handleFacilityChange,
    selectedPropertyTypes,
    handlePropertyTypeChange,
    showMoreFacilities,
    setShowMoreFacilities,
    showMorePropertyTypes,
    setShowMorePropertyTypes,
    selectedRatings,
    handleRatingChange,
    handlePriceChange,
  } = FilterLogic();

  return (
    <div>
      {/* Price filter with slider */}
      <div className="filter-section">
        <div className='FilterTitle'>Price Range</div>
        <div className="slider-container">
          <Slider
            sx={{
              '& .MuiSlider-thumb': {
                width: 27,
                height: 27,
                backgroundColor: '#ffffff',
                border: '1px solid #d3d3d3',
              },
              '& .MuiSlider-rail': {
                backgroundColor: '#e6e6e6',
              },
              '& .MuiSlider-track': {
                backgroundColor: '#4caf50',
                border: '1px solid #4caf50',
              },
              '& .MuiSlider-thumb:hover': {
                backgroundColor: '#e2e2e2',
              },
            }}
            value={priceValues}
            onChange={(e, newValues) => setPriceValues(newValues)}
            valueLabelDisplay="auto"
            min={15}
            max={400}
            step={1}
            valueLabelFormat={(value) => `€${value}`}
            disableSwap
          />
          <div className="price-inputs">
            <div>
              <label>Min:</label>
              <input
                type="text"
                value={`€${priceValues[0] || ''}`}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  handlePriceChange(0, value);
                }}
              />
            </div>
            <div>
              <label>Max:</label>
              <input
                type="text"
                value={`€${priceValues[1] || ''}`}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  handlePriceChange(1, value);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Facility filter with checkboxes */}
      <div className="filter-section">
        <div className='FilterTitle'>Facilities</div>
        <div className="facility-list">
          {Object.keys(selectedFacilities).slice(0, 5).map((facility) => (
            <label key={facility} className="facility-item">
              <input
                type="checkbox"
                name={facility}
                checked={selectedFacilities[facility]}
                onChange={handleFacilityChange}
                className="filter-select-option"
              />
              {facility.charAt(0).toUpperCase() + facility.slice(1)}
            </label>
          ))}
          {showMoreFacilities &&
            Object.keys(selectedFacilities)
              .slice(5)
              .map((facility) => (
                <label key={facility} className="facility-item">
                  <input
                    type="checkbox"
                    name={facility}
                    checked={selectedFacilities[facility]}
                    onChange={handleFacilityChange}
                    className="filter-select-option"
                  />
                  {facility.charAt(0).toUpperCase() + facility.slice(1)}
                </label>
              ))}
        </div>
        <span
          onClick={() => setShowMoreFacilities(!showMoreFacilities)}
          className="show-more-text"
        >
          {showMoreFacilities ? 'Show Less' : 'Show More'}
        </span>
      </div>

      {/* Property type filter with checkboxes */}
      <div className="filter-section">
        <div className='FilterTitle'>Property Type</div>
        <div className="facility-list">
          {Object.keys(selectedPropertyTypes).slice(0, 5).map((propertyType) => (
            <label key={propertyType} className="facility-item">
              <input
                type="checkbox"
                name={propertyType}
                checked={selectedPropertyTypes[propertyType]}
                onChange={handlePropertyTypeChange}
                className="filter-select-option"
              />
              {propertyType.charAt(0).toUpperCase() + propertyType.slice(1)}
            </label>
          ))}
          {showMorePropertyTypes &&
            Object.keys(selectedPropertyTypes)
              .slice(5)
              .map((propertyType) => (
                <label key={propertyType} className="facility-item">
                  <input
                    type="checkbox"
                    name={propertyType}
                    checked={selectedPropertyTypes[propertyType]}
                    onChange={handlePropertyTypeChange}
                    className="filter-select-option"
                  />
                  {propertyType.charAt(0).toUpperCase() + propertyType.slice(1)}
                </label>
              ))}
        </div>
        <span
          onClick={() => setShowMorePropertyTypes(!showMorePropertyTypes)}
          className="show-more-text"
        >
          {showMorePropertyTypes ? 'Show Less' : 'Show More'}
        </span>
      </div>

      {/* Rating filter with checkboxes */}
      <div className="filter-section">
        <div className='FilterTitle'>Property Rating</div>
        <div className="facility-list">
          {Object.keys(selectedRatings).map((rating) => (
            <label key={rating} className="facility-item">
              <input
                type="checkbox"
                name={rating}
                checked={selectedRatings[rating]}
                onChange={handleRatingChange}
                className="filter-select-option"
              />
              {rating} Star{rating > 1 ? 's' : ''}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FilterUi;
